package services

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
	"github.com/tdvorak/primora/apps/backend/internal/models"
	"github.com/tdvorak/primora/apps/backend/internal/secrets"
)

const (
	WebhookEventIssueCreated    = "issue.created"
	WebhookEventDeployMarker    = "deploy.marker"
	WebhookEventTest            = "webhook.test"
	WebhookEventAlertFired      = "alert.fired"
	WebhookEventAlertResolved   = "alert.resolved"
	WebhookEventDocumentCreated = "document.created"
	WebhookEventDocumentUpdated = "document.updated"
	WebhookEventDocumentDeleted = "document.deleted"
	WebhookEventObjectCreated   = "object.created"
	WebhookEventObjectUpdated   = "object.updated"
	WebhookEventObjectDeleted   = "object.deleted"
)

var webhookEventTypes = map[string]bool{
	WebhookEventIssueCreated:    true,
	WebhookEventDeployMarker:    true,
	WebhookEventTest:            true,
	WebhookEventAlertFired:      true,
	WebhookEventAlertResolved:   true,
	WebhookEventInboundReceived: true,
	WebhookEventJobRun:          true,
	WebhookEventDocumentCreated: true,
	WebhookEventDocumentUpdated: true,
	WebhookEventDocumentDeleted: true,
	WebhookEventObjectCreated:   true,
	WebhookEventObjectUpdated:   true,
	WebhookEventObjectDeleted:   true,
}

const webhookMaxAttempts = 3

type CreateWebhookInput struct {
	URL     string   `json:"url" validate:"required,url"`
	Secret  string   `json:"secret"`
	Events  []string `json:"events"`
	Enabled *bool    `json:"enabled"`
}

type UpdateWebhookInput struct {
	URL     *string  `json:"url" validate:"omitempty,url"`
	Secret  *string  `json:"secret"`
	Events  []string `json:"events"`
	Enabled *bool    `json:"enabled"`
}

type WebhookSummary struct {
	ID        uuid.UUID `json:"id"`
	ProjectID uuid.UUID `json:"project_id"`
	URL       string    `json:"url"`
	Events    []string  `json:"events"`
	Enabled   bool      `json:"enabled"`
	HasSecret bool      `json:"has_secret"`
	CreatedAt time.Time `json:"created_at"`
	// Secret is populated only when Primora generated the secret — it is the
	// one chance to see it. Not part of the stored shape.
	Secret string `json:"secret,omitempty"`
}

type WebhookDeliverySummary struct {
	ID             uuid.UUID       `json:"id"`
	WebhookID      uuid.UUID       `json:"webhook_id"`
	EventType      string          `json:"event_type"`
	Payload        json.RawMessage `json:"payload"`
	Status         string          `json:"status"`
	Attempts       int32           `json:"attempts"`
	LastStatusCode *int32          `json:"last_status_code"`
	LastError      string          `json:"last_error"`
	DeliveredAt    *time.Time      `json:"delivered_at"`
	NextRetryAt    *time.Time      `json:"next_retry_at"`
	CreatedAt      time.Time       `json:"created_at"`
}

type CreateDeployMarkerInput struct {
	Version     string `json:"version"`
	Ref         string `json:"ref"`
	Environment string `json:"environment"`
	Note        string `json:"note"`
}

type DeployMarker struct {
	Version     string    `json:"version,omitempty"`
	Ref         string    `json:"ref,omitempty"`
	Environment string    `json:"environment,omitempty"`
	Note        string    `json:"note,omitempty"`
	RecordedAt  time.Time `json:"recorded_at"`
}

func toWebhookSummary(row db.CoreWebhook) WebhookSummary {
	events := row.Events
	if events == nil {
		events = []string{}
	}
	return WebhookSummary{
		ID:        row.ID,
		ProjectID: row.ProjectID,
		URL:       row.Url,
		Events:    events,
		Enabled:   row.Enabled,
		HasSecret: len(row.Secret) > 0,
		CreatedAt: row.CreatedAt.Time,
	}
}

func toDeliverySummary(row db.CoreWebhookDelivery) WebhookDeliverySummary {
	out := WebhookDeliverySummary{
		ID:        row.ID,
		WebhookID: row.WebhookID,
		EventType: row.EventType,
		Payload:   row.Payload,
		Status:    row.Status,
		Attempts:  row.Attempts,
		LastError: row.LastError,
		CreatedAt: row.CreatedAt.Time,
	}
	if row.LastStatusCode != nil {
		code := *row.LastStatusCode
		out.LastStatusCode = &code
	}
	if row.DeliveredAt.Valid {
		t := row.DeliveredAt.Time
		out.DeliveredAt = &t
	}
	if row.NextRetryAt.Valid {
		t := row.NextRetryAt.Time
		out.NextRetryAt = &t
	}
	return out
}

// normalizeWebhookURL requires https for public targets. Plain http is allowed
// for private/self-hosted sinks: loopback, RFC1918/link-local IPs, .local /
// .internal / .lan names, host.docker.internal, and bare hostnames (Docker
// service names on the internal network).
func normalizeWebhookURL(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	u, err := url.Parse(trimmed)
	if err != nil || u.Host == "" {
		return "", inputErrorf("webhook url must be an https URL")
	}
	if u.Scheme == "https" {
		return trimmed, nil
	}
	if u.Scheme == "http" && isPrivateWebhookHost(u.Hostname()) {
		return trimmed, nil
	}
	return "", inputErrorf("webhook url must be https (http allowed only for private/self-hosted targets)")
}

var decimalOrHexIPRe = regexp.MustCompile(`^(0x[0-9a-f]+|[0-9]+)$`)

// metadataAddrs are link-local addresses that serve cloud instance
// metadata — "private" by range but a privileged SSRF target.
var metadataAddrs = map[string]bool{
	"169.254.169.254": true, // AWS/GCP/Azure
	"fd00:ec2::254":   true, // AWS IPv6 metadata
}

func isPrivateWebhookHost(host string) bool {
	h := strings.ToLower(strings.Trim(host, "[]"))
	if metadataAddrs[h] {
		return false
	}
	if h == "localhost" || h == "host.docker.internal" ||
		strings.HasSuffix(h, ".local") || strings.HasSuffix(h, ".internal") || strings.HasSuffix(h, ".lan") {
		return true
	}
	if !strings.Contains(h, ".") && !strings.Contains(h, ":") {
		// Bare hostname — docker service name, unqualified LAN host. A
		// pure decimal/hex integer is never a service name: it's a
		// non-canonical IP encoding (2130706433 = 127.0.0.1, 0x7f000001).
		if decimalOrHexIPRe.MatchString(h) {
			return false
		}
		return true
	}
	ip := net.ParseIP(h)
	if ip == nil {
		return false
	}
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast()
}

// webhookEventNamespaces are the valid `<ns>.*` subscription prefixes —
// derived from the known system event types.
func webhookEventNamespaces() map[string]bool {
	ns := map[string]bool{}
	for t := range webhookEventTypes {
		if i := strings.Index(t, "."); i > 0 {
			ns[t[:i]] = true
		}
	}
	return ns
}

// validateWebhookEvents accepts known system types, `*`, `<ns>.*` namespace
// patterns, and `custom.*` wildcard patterns — the same grammar functions
// use for event_pattern. Matching happens via SQL LIKE at dispatch.
func validateWebhookEvents(events []string) ([]string, error) {
	out := make([]string, 0, len(events))
	seen := map[string]bool{}
	namespaces := webhookEventNamespaces()
	for _, e := range events {
		e = strings.TrimSpace(e)
		if e == "" {
			continue
		}
		valid := webhookEventTypes[e] || e == "*"
		if !valid && strings.HasSuffix(e, ".*") {
			valid = namespaces[strings.TrimSuffix(e, ".*")]
		}
		if !valid && strings.HasPrefix(e, "custom.") {
			// `*` isn't in the type grammar — probe it as a literal.
			valid = customEventTypeRe.MatchString(strings.ReplaceAll(e, "*", "x"))
		}
		if !valid {
			return nil, inputErrorf("invalid event type %q — use a known type, <namespace>.*, custom.<pattern>, or *", e)
		}
		if !seen[e] {
			seen[e] = true
			out = append(out, e)
		}
	}
	return out, nil
}

func (s *PlatformService) webhookFor(ctx context.Context, actor *models.Actor, projectID, webhookID uuid.UUID, write bool) (db.CoreWebhook, error) {
	roles := []string{"admin", "developer", "viewer"}
	if write {
		roles = []string{"admin", "developer"}
	}
	if err := s.requireProjectRole(ctx, actor, projectID, roles...); err != nil {
		return db.CoreWebhook{}, err
	}
	row, err := s.repo.Queries().GetWebhookByID(ctx, webhookID)
	if err != nil {
		return db.CoreWebhook{}, err
	}
	if row.ProjectID != projectID {
		return db.CoreWebhook{}, fmt.Errorf("webhook access denied")
	}
	return row, nil
}

func (s *PlatformService) ListWebhooks(ctx context.Context, actor *models.Actor, projectID uuid.UUID) ([]WebhookSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	rows, err := s.repo.Queries().ListWebhooks(ctx, projectID)
	if err != nil {
		return nil, err
	}
	out := make([]WebhookSummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, toWebhookSummary(row))
	}
	return out, nil
}

func (s *PlatformService) CreateWebhook(ctx context.Context, actor *models.Actor, projectID uuid.UUID, input CreateWebhookInput, requestID string) (WebhookSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return WebhookSummary{}, err
	}
	hookURL, err := normalizeWebhookURL(input.URL)
	if err != nil {
		return WebhookSummary{}, err
	}
	events, err := validateWebhookEvents(input.Events)
	if err != nil {
		return WebhookSummary{}, err
	}
	secret := strings.TrimSpace(input.Secret)
	generated := false
	if secret == "" {
		secret, err = randomToken(16)
		if err != nil {
			return WebhookSummary{}, err
		}
		generated = true
	}
	secretBytes, err := s.enc.Encrypt([]byte(secret))
	if err != nil {
		return WebhookSummary{}, err
	}
	enabled := true
	if input.Enabled != nil {
		enabled = *input.Enabled
	}
	var createdBy pgtype.UUID
	if actor.UserID != nil {
		createdBy = pgtype.UUID{Bytes: *actor.UserID, Valid: true}
	}
	row, err := s.repo.Queries().CreateWebhook(ctx, db.CreateWebhookParams{
		ProjectID:       projectID,
		Url:             hookURL,
		Secret:          secretBytes,
		Events:          events,
		Enabled:         enabled,
		CreatedByUserID: createdBy,
	})
	if err != nil {
		if strings.Contains(err.Error(), "webhooks_project_id_url_key") {
			return WebhookSummary{}, fmt.Errorf("a webhook for %s already exists", hookURL)
		}
		return WebhookSummary{}, err
	}
	project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
	if err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "webhook.created", "webhook", row.ID.String(), map[string]any{
			"url": row.Url, "events": events,
		}))
	}
	summary := toWebhookSummary(row)
	if generated {
		summary.Secret = secret
	}
	return summary, nil
}

func (s *PlatformService) UpdateWebhook(ctx context.Context, actor *models.Actor, projectID, webhookID uuid.UUID, input UpdateWebhookInput, requestID string) (WebhookSummary, error) {
	row, err := s.webhookFor(ctx, actor, projectID, webhookID, true)
	if err != nil {
		return WebhookSummary{}, err
	}
	hookURL := row.Url
	if input.URL != nil {
		if hookURL, err = normalizeWebhookURL(*input.URL); err != nil {
			return WebhookSummary{}, err
		}
	}
	events := row.Events
	if input.Events != nil {
		if events, err = validateWebhookEvents(input.Events); err != nil {
			return WebhookSummary{}, err
		}
	}
	enabled := row.Enabled
	if input.Enabled != nil {
		enabled = *input.Enabled
	}
	rotateSecret := input.Secret != nil
	var secretBytes []byte
	if rotateSecret {
		secret := strings.TrimSpace(*input.Secret)
		if secret == "" {
			if secret, err = randomToken(16); err != nil {
				return WebhookSummary{}, err
			}
		}
		if secretBytes, err = s.enc.Encrypt([]byte(secret)); err != nil {
			return WebhookSummary{}, err
		}
	}
	updated, err := s.repo.Queries().UpdateWebhook(ctx, db.UpdateWebhookParams{
		ID:        webhookID,
		ProjectID: projectID,
		Url:       hookURL,
		Events:    events,
		Enabled:   enabled,
		Column6:   rotateSecret,
		Secret:    secretBytes,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return WebhookSummary{}, err
		}
		if strings.Contains(err.Error(), "webhooks_project_id_url_key") {
			return WebhookSummary{}, fmt.Errorf("a webhook for %s already exists", hookURL)
		}
		return WebhookSummary{}, err
	}
	project, _ := s.repo.Queries().GetProjectByID(ctx, projectID)
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "webhook.updated", "webhook", webhookID.String(), map[string]any{
		"url": updated.Url, "events": updated.Events, "enabled": updated.Enabled, "secret_rotated": rotateSecret,
	}))
	summary := toWebhookSummary(updated)
	if rotateSecret && input.Secret != nil && strings.TrimSpace(*input.Secret) == "" {
		// generated on rotation — return once
		plain, decErr := s.enc.Decrypt(updated.Secret)
		if decErr == nil {
			summary.Secret = string(plain)
		}
	}
	return summary, nil
}

func (s *PlatformService) DeleteWebhook(ctx context.Context, actor *models.Actor, projectID, webhookID uuid.UUID, requestID string) error {
	row, err := s.webhookFor(ctx, actor, projectID, webhookID, true)
	if err != nil {
		return err
	}
	if _, err := s.repo.Queries().DeleteWebhook(ctx, db.DeleteWebhookParams{
		ID:        webhookID,
		ProjectID: projectID,
	}); err != nil {
		return err
	}
	project, _ := s.repo.Queries().GetProjectByID(ctx, projectID)
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "webhook.deleted", "webhook", webhookID.String(), map[string]any{
		"url": row.Url,
	}))
	return nil
}

func (s *PlatformService) ListWebhookDeliveries(ctx context.Context, actor *models.Actor, projectID, webhookID uuid.UUID, limit int32) ([]WebhookDeliverySummary, error) {
	if _, err := s.webhookFor(ctx, actor, projectID, webhookID, false); err != nil {
		return nil, err
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.repo.Queries().ListWebhookDeliveries(ctx, db.ListWebhookDeliveriesParams{
		WebhookID: webhookID,
		Limit:     limit,
	})
	if err != nil {
		return nil, err
	}
	out := make([]WebhookDeliverySummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, toDeliverySummary(row))
	}
	return out, nil
}

// TestWebhook queues a webhook.test delivery to one endpoint.
func (s *PlatformService) TestWebhook(ctx context.Context, actor *models.Actor, projectID, webhookID uuid.UUID, requestID string) (WebhookDeliverySummary, error) {
	row, err := s.webhookFor(ctx, actor, projectID, webhookID, true)
	if err != nil {
		return WebhookDeliverySummary{}, err
	}
	delivery, err := s.enqueueDelivery(ctx, row, WebhookEventTest, map[string]any{
		"message": "primora webhook test",
	})
	if err != nil {
		return WebhookDeliverySummary{}, err
	}
	if project, err := s.repo.Queries().GetProjectByID(ctx, projectID); err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "webhook.tested", "webhook", webhookID.String(), map[string]any{
			"url": row.Url,
		}))
	}
	return toDeliverySummary(delivery), nil
}

// CreateDeployMarker records the marker in the audit log and fans out a
// deploy.marker event to matching webhooks.
func (s *PlatformService) CreateDeployMarker(ctx context.Context, actor *models.Actor, projectID uuid.UUID, input CreateDeployMarkerInput, requestID string) (DeployMarker, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return DeployMarker{}, err
	}
	marker := DeployMarker{
		Version:     strings.TrimSpace(input.Version),
		Ref:         strings.TrimSpace(input.Ref),
		Environment: strings.TrimSpace(input.Environment),
		Note:        strings.TrimSpace(input.Note),
		RecordedAt:  time.Now().UTC(),
	}
	if marker.Version == "" && marker.Ref == "" {
		return DeployMarker{}, errors.New("version or ref required")
	}
	project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
	if err != nil {
		return DeployMarker{}, err
	}
	meta := map[string]any{"version": marker.Version, "ref": marker.Ref, "environment": marker.Environment, "note": marker.Note}
	if _, err := s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "deploy.marker", "deploy_marker", marker.Ref+marker.Version, meta)); err != nil {
		return DeployMarker{}, err
	}
	s.publishEvent(ctx, projectID, WebhookEventDeployMarker, map[string]any{
		"version":     marker.Version,
		"ref":         marker.Ref,
		"environment": marker.Environment,
		"note":        marker.Note,
		"recorded_at": marker.RecordedAt,
	})
	return marker, nil
}

// dispatchEvent fans an event out to matching enabled webhooks. Deliveries are
// persisted first, then queued in-process — the DB row is the source of truth.
func (s *PlatformService) dispatchEvent(ctx context.Context, projectID uuid.UUID, eventType string, data map[string]any) {
	hooks, err := s.repo.Queries().ListWebhooksForEvent(ctx, db.ListWebhooksForEventParams{
		ProjectID: projectID,
		Column2:   eventType,
	})
	if err != nil {
		return
	}
	for _, hook := range hooks {
		_, _ = s.enqueueDelivery(ctx, hook, eventType, data)
	}
}

func (s *PlatformService) enqueueDelivery(ctx context.Context, hook db.CoreWebhook, eventType string, data map[string]any) (db.CoreWebhookDelivery, error) {
	payload, _ := json.Marshal(map[string]any{
		"event":       eventType,
		"project_id":  hook.ProjectID.String(),
		"occurred_at": time.Now().UTC().Format(time.RFC3339),
		"data":        data,
	})
	delivery, err := s.repo.Queries().InsertWebhookDelivery(ctx, db.InsertWebhookDeliveryParams{
		WebhookID: hook.ID,
		EventType: eventType,
		Payload:   payload,
	})
	if err != nil {
		return db.CoreWebhookDelivery{}, err
	}
	if s.dispatcher != nil {
		s.dispatcher.push(delivery.ID)
	}
	return delivery, nil
}

// ---------------------------------------------------------------------------
// dispatcher — in-process worker, buffered queue, backoff retry
// ---------------------------------------------------------------------------

type WebhookDispatcher struct {
	repo    queries
	enc     *secrets.Encryptor
	logger  *slog.Logger
	http    *http.Client
	queue   chan uuid.UUID
	quit    chan struct{}
	wg      sync.WaitGroup
	timerMu sync.Mutex
	timers  map[uuid.UUID]*time.Timer
	started sync.Once
}

// queries is the slice of db.Queries the dispatcher needs — kept narrow so
// tests can stub it without a database.
type queries interface {
	GetWebhookDeliveryByID(ctx context.Context, id uuid.UUID) (db.CoreWebhookDelivery, error)
	GetWebhookByID(ctx context.Context, id uuid.UUID) (db.CoreWebhook, error)
	ListPendingWebhookDeliveries(ctx context.Context, limit int32) ([]db.CoreWebhookDelivery, error)
	MarkWebhookDelivery(ctx context.Context, params db.MarkWebhookDeliveryParams) error
}

func NewWebhookDispatcher(q queries, enc *secrets.Encryptor, logger *slog.Logger) *WebhookDispatcher {
	if logger == nil {
		logger = slog.Default()
	}
	return &WebhookDispatcher{
		repo:   q,
		enc:    enc,
		logger: logger,
		http:   &http.Client{Timeout: 10 * time.Second},
		queue:  make(chan uuid.UUID, 1024),
		quit:   make(chan struct{}),
		timers: map[uuid.UUID]*time.Timer{},
	}
}

// Start launches the worker and re-queues deliveries left pending by a crash.
func (d *WebhookDispatcher) Start(ctx context.Context) {
	d.started.Do(func() {
		d.wg.Add(1)
		go d.run()
		if pending, err := d.repo.ListPendingWebhookDeliveries(ctx, 200); err == nil {
			for _, row := range pending {
				d.push(row.ID)
			}
		}
	})
}

func (d *WebhookDispatcher) Stop() {
	close(d.quit)
	d.timerMu.Lock()
	for _, t := range d.timers {
		t.Stop()
	}
	d.timerMu.Unlock()
	d.wg.Wait()
}

func (d *WebhookDispatcher) push(id uuid.UUID) {
	select {
	case d.queue <- id:
	case <-d.quit:
	default:
		// queue full — drop; the row stays pending and is retried on restart
	}
}

func (d *WebhookDispatcher) run() {
	defer d.wg.Done()
	for {
		select {
		case id := <-d.queue:
			d.deliver(context.Background(), id)
		case <-d.quit:
			return
		}
	}
}

// signBody is the canonical HMAC-SHA256 signature: hex of the keyed digest of
// the exact bytes sent. Receivers verify against the raw body.
func signBody(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

func (d *WebhookDispatcher) deliver(ctx context.Context, deliveryID uuid.UUID) {
	delivery, err := d.repo.GetWebhookDeliveryByID(ctx, deliveryID)
	if err != nil || delivery.Status != "pending" {
		return
	}
	hook, err := d.repo.GetWebhookByID(ctx, delivery.WebhookID)
	if err != nil {
		d.mark(delivery, "failed", nil, "webhook deleted", nil)
		return
	}

	var statusCode *int32
	var sendErr error
	secret := ""
	if len(hook.Secret) > 0 && d.enc != nil {
		if plain, err := d.enc.Decrypt(hook.Secret); err == nil {
			secret = string(plain)
		}
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, hook.Url, bytes.NewReader(delivery.Payload))
	if err == nil {
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Primora-Event", delivery.EventType)
		req.Header.Set("X-Primora-Delivery", delivery.ID.String())
		req.Header.Set("X-Primora-Signature", "sha256="+signBody(secret, delivery.Payload))
		resp, doErr := d.http.Do(req)
		if doErr != nil {
			sendErr = doErr
		} else {
			code := int32(resp.StatusCode)
			statusCode = &code
			_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<16))
			resp.Body.Close()
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				now := time.Now()
				d.mark(delivery, "delivered", statusCode, "", &now)
				return
			}
			sendErr = fmt.Errorf("endpoint returned %d", resp.StatusCode)
		}
	} else {
		sendErr = err
	}

	attempts := delivery.Attempts + 1
	if attempts >= webhookMaxAttempts {
		d.mark(delivery, "failed", statusCode, errString(sendErr), nil)
		return
	}
	retryAt := time.Now().Add(time.Duration(attempts*attempts) * 15 * time.Second)
	d.mark(delivery, "pending", statusCode, errString(sendErr), nil, retryAt)
	d.timerMu.Lock()
	d.timers[delivery.ID] = time.AfterFunc(time.Duration(attempts*attempts)*15*time.Second, func() {
		d.timerMu.Lock()
		delete(d.timers, delivery.ID)
		d.timerMu.Unlock()
		d.push(delivery.ID)
	})
	d.timerMu.Unlock()
}

func (d *WebhookDispatcher) mark(delivery db.CoreWebhookDelivery, status string, statusCode *int32, lastError string, deliveredAt *time.Time, nextRetry ...time.Time) {
	params := db.MarkWebhookDeliveryParams{
		ID:        delivery.ID,
		Status:    status,
		LastError: lastError,
	}
	params.LastStatusCode = statusCode
	if deliveredAt != nil {
		params.DeliveredAt = pgtype.Timestamptz{Time: *deliveredAt, Valid: true}
	}
	if len(nextRetry) > 0 {
		params.NextRetryAt = pgtype.Timestamptz{Time: nextRetry[0], Valid: true}
	} else {
		params.NextRetryAt = pgtype.Timestamptz{}
	}
	if err := d.repo.MarkWebhookDelivery(context.Background(), params); err != nil {
		d.logger.Warn("webhook delivery update failed", "delivery", delivery.ID, "error", err)
	}
}

func errString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
