package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/google/uuid"

	"github.com/tdvorak/primora/apps/backend/internal/models"
)

// rybbitClient is a read-only client for a self-hosted Rybbit instance's
// documented stats API (/api/*). The Bearer key stays server-side.
type rybbitClient struct {
	base   string
	apiKey string
	http   *http.Client
}

func newRybbitClient(base, apiKey string) *rybbitClient {
	return &rybbitClient{base: base, apiKey: apiKey, http: &http.Client{Timeout: 8 * time.Second}}
}

// get fetches path and unmarshals the body. Non-2xx surfaces the status code.
func (c *rybbitClient) get(ctx context.Context, path string, query url.Values, out any) error {
	u := c.base + path
	if len(query) > 0 {
		u += "?" + query.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	if c.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("rybbit unreachable: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("rybbit returned status %d", resp.StatusCode)
	}
	if len(body) == 0 {
		return nil
	}
	return json.Unmarshal(body, out)
}

type RybbitSite struct {
	SiteID string `json:"site_id"`
	Name   string `json:"name"`
	Domain string `json:"domain,omitempty"`
}

type RybbitOverview struct {
	Sessions        *float64 `json:"sessions,omitempty"`
	Pageviews       *float64 `json:"pageviews,omitempty"`
	Users           *float64 `json:"users,omitempty"`
	PagesPerSession *float64 `json:"pages_per_session,omitempty"`
	BounceRate      *float64 `json:"bounce_rate,omitempty"`
	SessionDuration *float64 `json:"session_duration,omitempty"`
}

type RybbitSeriesPoint struct {
	Time       string   `json:"time"`
	Sessions   *float64 `json:"sessions,omitempty"`
	Pageviews  *float64 `json:"pageviews,omitempty"`
	Users      *float64 `json:"users,omitempty"`
	BounceRate *float64 `json:"bounce_rate,omitempty"`
}

type RybbitMetricItem struct {
	Value      string   `json:"value"`
	Count      float64  `json:"count"`
	Percentage *float64 `json:"percentage,omitempty"`
}

type IntegrationAnalyticsResult struct {
	IntegrationID uuid.UUID           `json:"integration_id"`
	Site          *RybbitSite         `json:"site,omitempty"`
	Sites         []RybbitSite        `json:"sites,omitempty"`
	Overview      *RybbitOverview     `json:"overview,omitempty"`
	Series        []RybbitSeriesPoint `json:"series,omitempty"`
	TopPages      []RybbitMetricItem  `json:"top_pages,omitempty"`
	TopReferrers  []RybbitMetricItem  `json:"top_referrers,omitempty"`
	WindowDays    int                 `json:"window_days"`
}

// rybbitOrg normalizes the few shapes GET /api/organizations returns across
// versions ([]org, {data:[...]}, {organizations:[...]}).
type rybbitOrg struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

func (c *rybbitClient) organizations(ctx context.Context) ([]rybbitOrg, error) {
	var raw json.RawMessage
	if err := c.get(ctx, "/api/organizations", nil, &raw); err != nil {
		return nil, err
	}
	var list []rybbitOrg
	if err := json.Unmarshal(raw, &list); err == nil {
		return list, nil
	}
	for _, key := range []string{"data", "organizations"} {
		var wrapped map[string]json.RawMessage
		if err := json.Unmarshal(raw, &wrapped); err != nil {
			break
		}
		if inner, ok := wrapped[key]; ok {
			if err := json.Unmarshal(inner, &list); err == nil {
				return list, nil
			}
		}
	}
	return nil, errors.New("unexpected /api/organizations shape")
}

func (c *rybbitClient) orgSites(ctx context.Context, orgID string) ([]RybbitSite, error) {
	var resp struct {
		Sites []struct {
			SiteID json.Number `json:"siteId"`
			Name   string      `json:"name"`
			Domain string      `json:"domain"`
		} `json:"sites"`
	}
	if err := c.get(ctx, "/api/organizations/"+url.PathEscape(orgID)+"/sites", nil, &resp); err != nil {
		return nil, err
	}
	out := make([]RybbitSite, 0, len(resp.Sites))
	for _, site := range resp.Sites {
		out = append(out, RybbitSite{SiteID: site.SiteID.String(), Name: site.Name, Domain: site.Domain})
	}
	return out, nil
}

func (c *rybbitClient) siteDetail(ctx context.Context, siteID string) (*RybbitSite, error) {
	var resp struct {
		SiteID json.Number `json:"siteId"`
		Name   string      `json:"name"`
		Domain string      `json:"domain"`
	}
	if err := c.get(ctx, "/api/sites/"+url.PathEscape(siteID), nil, &resp); err != nil {
		return nil, err
	}
	return &RybbitSite{SiteID: resp.SiteID.String(), Name: resp.Name, Domain: resp.Domain}, nil
}

func rybbitRangeQuery(days int) url.Values {
	end := time.Now().UTC()
	start := end.AddDate(0, 0, -days)
	return url.Values{
		"start_date": {start.Format("2006-01-02")},
		"end_date":   {end.Format("2006-01-02")},
		"time_zone":  {"UTC"},
	}
}

// IntegrationAnalytics pulls normalized stats from a rybbit-type integration.
// Site resolution: ?site= override → configured site_id → first accessible site.
func (s *PlatformService) IntegrationAnalytics(ctx context.Context, actor *models.Actor, projectID, integrationID uuid.UUID, siteOverride string, days int) (*IntegrationAnalyticsResult, error) {
	row, err := s.integrationFor(ctx, actor, projectID, integrationID, false)
	if err != nil {
		return nil, err
	}
	if row.Type != "rybbit" {
		return nil, fmt.Errorf("integration %s does not provide analytics", row.Type)
	}
	creds, err := s.decryptCredentials(row)
	if err != nil {
		return nil, err
	}
	if creds.APIKey == "" {
		return nil, errors.New("integration has no credentials configured")
	}
	if days <= 0 || days > 365 {
		days = 30
	}

	client := newRybbitClient(row.BaseUrl, creds.APIKey)
	cfg := parseIntegrationConfig(row.Config)
	result := &IntegrationAnalyticsResult{IntegrationID: row.ID, WindowDays: days}

	siteID := siteOverride
	if siteID == "" {
		siteID = cfg.SiteID
	}

	// Site discovery only runs when no site is pinned — it needs an
	// org-scope endpoint personal keys may not expose.
	if siteID == "" {
		orgs, err := client.organizations(ctx)
		if err != nil {
			return nil, fmt.Errorf("site discovery failed: %w — set site_id on the integration or pass ?site=", err)
		}
		for _, org := range orgs {
			orgID := org.ID
			if orgID == "" {
				orgID = org.Slug
			}
			if orgID == "" {
				continue
			}
			sites, err := client.orgSites(ctx, orgID)
			if err != nil {
				continue
			}
			result.Sites = append(result.Sites, sites...)
		}
		if len(result.Sites) == 0 {
			return nil, errors.New("no rybbit sites found — set site_id on the integration")
		}
		siteID = result.Sites[0].SiteID
	}

	site, err := client.siteDetail(ctx, siteID)
	if err == nil {
		result.Site = site
	} else {
		result.Site = &RybbitSite{SiteID: siteID}
	}

	query := rybbitRangeQuery(days)

	var overview struct {
		Data RybbitOverview `json:"data"`
	}
	if err := client.get(ctx, "/api/sites/"+url.PathEscape(siteID)+"/overview", query, &overview); err != nil {
		return nil, err
	}
	result.Overview = &overview.Data

	seriesQuery := rybbitRangeQuery(days)
	seriesQuery.Set("bucket", "day")
	var series struct {
		Data []RybbitSeriesPoint `json:"data"`
	}
	if err := client.get(ctx, "/api/sites/"+url.PathEscape(siteID)+"/overview/time-series", seriesQuery, &series); err == nil {
		result.Series = series.Data
	}

	var metric struct {
		Data struct {
			Data []RybbitMetricItem `json:"data"`
		} `json:"data"`
	}
	pagesQuery := rybbitRangeQuery(days)
	pagesQuery.Set("parameter", "pathname")
	pagesQuery.Set("limit", "10")
	if err := client.get(ctx, "/api/sites/"+url.PathEscape(siteID)+"/metric", pagesQuery, &metric); err == nil {
		result.TopPages = metric.Data.Data
	}
	referrerQuery := rybbitRangeQuery(days)
	referrerQuery.Set("parameter", "referrer")
	referrerQuery.Set("limit", "10")
	if err := client.get(ctx, "/api/sites/"+url.PathEscape(siteID)+"/metric", referrerQuery, &metric); err == nil {
		result.TopReferrers = metric.Data.Data
	}

	return result, nil
}
