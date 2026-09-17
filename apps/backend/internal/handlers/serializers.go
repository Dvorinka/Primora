package handlers

import (
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
)

type organizationMembershipResponse struct {
	ID             string `json:"id"`
	Slug           string `json:"slug"`
	Name           string `json:"name"`
	MembershipRole string `json:"membership_role"`
}

type projectResponse struct {
	ID                   string  `json:"id"`
	OrganizationID       string  `json:"organization_id"`
	Slug                 string  `json:"slug"`
	Name                 string  `json:"name"`
	Description          *string `json:"description"`
	MembershipRole       *string `json:"membership_role"`
	RetentionEventsDays  int32   `json:"retention_events_days"`
	RetentionAuditDays   int32   `json:"retention_audit_days"`
	RetentionWebhookDays int32   `json:"retention_webhook_days"`
}

type apiKeyResponse struct {
	ID         string     `json:"id"`
	ProjectID  string     `json:"project_id"`
	Name       string     `json:"name"`
	Prefix     string     `json:"prefix"`
	Scopes     []string   `json:"scopes"`
	LastUsedAt *time.Time `json:"last_used_at"`
	RevokedAt  *time.Time `json:"revoked_at"`
}

type bucketResponse struct {
	ID         string `json:"id"`
	ProjectID  string `json:"project_id"`
	Slug       string `json:"slug"`
	Name       string `json:"name"`
	Visibility string `json:"visibility"`
}

type bucketObjectResponse struct {
	ID             string    `json:"id"`
	BucketID       string    `json:"bucket_id"`
	ObjectKey      string    `json:"object_key"`
	ContentType    string    `json:"content_type"`
	SizeBytes      int64     `json:"size_bytes"`
	ChecksumSHA256 string    `json:"checksum_sha256"`
	CreatedAt      time.Time `json:"created_at"`
}

type auditLogResponse struct {
	ID           string         `json:"id"`
	CreatedAt    time.Time      `json:"created_at"`
	Action       string         `json:"action"`
	ResourceType string         `json:"resource_type"`
	ResourceID   string         `json:"resource_id"`
	RequestID    string         `json:"request_id"`
	Metadata     map[string]any `json:"metadata"`
}

type collectionResponse struct {
	ID          string         `json:"id"`
	ProjectID   string         `json:"project_id"`
	Slug        string         `json:"slug"`
	Name        string         `json:"name"`
	Description *string        `json:"description"`
	Schema      map[string]any `json:"schema"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

type documentResponse struct {
	ID           string         `json:"id"`
	CollectionID string         `json:"collection_id"`
	Data         map[string]any `json:"data"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
}

func toOrganizationMembershipResponse(row db.ListOrganizationsForUserRow) organizationMembershipResponse {
	return organizationMembershipResponse{
		ID:             row.ID.String(),
		Slug:           row.Slug,
		Name:           row.Name,
		MembershipRole: row.MembershipRole,
	}
}

func toOrganizationMembershipResponseFromCore(row db.CoreOrganization, role string) organizationMembershipResponse {
	return organizationMembershipResponse{
		ID:             row.ID.String(),
		Slug:           row.Slug,
		Name:           row.Name,
		MembershipRole: role,
	}
}

func toProjectListResponse(rows []db.ListProjectsForOrganizationRow) []projectResponse {
	result := make([]projectResponse, 0, len(rows))
	for _, row := range rows {
		result = append(result, toProjectFromRow(row))
	}
	return result
}

func toProjectFromRow(row db.ListProjectsForOrganizationRow) projectResponse {
	var membershipRole *string
	if row.MembershipRole.Valid {
		role := string(row.MembershipRole.CoreProjectRole)
		membershipRole = &role
	}
	return projectResponse{
		ID:                   row.ID.String(),
		OrganizationID:       row.OrganizationID.String(),
		Slug:                 row.Slug,
		Name:                 row.Name,
		Description:          row.Description,
		MembershipRole:       membershipRole,
		RetentionEventsDays:  row.RetentionEventsDays,
		RetentionAuditDays:   row.RetentionAuditDays,
		RetentionWebhookDays: row.RetentionWebhookDays,
	}
}

func toProjectFromCore(row db.CoreProject) projectResponse {
	return projectResponse{
		ID:                   row.ID.String(),
		OrganizationID:       row.OrganizationID.String(),
		Slug:                 row.Slug,
		Name:                 row.Name,
		Description:          row.Description,
		MembershipRole:       nil,
		RetentionEventsDays:  row.RetentionEventsDays,
		RetentionAuditDays:   row.RetentionAuditDays,
		RetentionWebhookDays: row.RetentionWebhookDays,
	}
}

func toAPIKeyListResponse(rows []db.CoreApiKey) []apiKeyResponse {
	result := make([]apiKeyResponse, 0, len(rows))
	for _, row := range rows {
		result = append(result, toAPIKeyResponse(row))
	}
	return result
}

func toAPIKeyResponse(row db.CoreApiKey) apiKeyResponse {
	return apiKeyResponse{
		ID:         row.ID.String(),
		ProjectID:  row.ProjectID.String(),
		Name:       row.Name,
		Prefix:     row.Prefix,
		Scopes:     row.Scopes,
		LastUsedAt: timestamptzPtr(row.LastUsedAt),
		RevokedAt:  timestamptzPtr(row.RevokedAt),
	}
}

func toBucketListResponse(rows []db.CoreBucket) []bucketResponse {
	result := make([]bucketResponse, 0, len(rows))
	for _, row := range rows {
		result = append(result, toBucketResponse(row))
	}
	return result
}

func toBucketResponse(row db.CoreBucket) bucketResponse {
	return bucketResponse{
		ID:         row.ID.String(),
		ProjectID:  row.ProjectID.String(),
		Slug:       row.Slug,
		Name:       row.Name,
		Visibility: row.Visibility,
	}
}

func toObjectListResponse(rows []db.CoreBucketObject) []bucketObjectResponse {
	result := make([]bucketObjectResponse, 0, len(rows))
	for _, row := range rows {
		result = append(result, toObjectResponse(row))
	}
	return result
}

func toObjectResponse(row db.CoreBucketObject) bucketObjectResponse {
	createdAt := time.Time{}
	if row.CreatedAt.Valid {
		createdAt = row.CreatedAt.Time
	}
	return bucketObjectResponse{
		ID:             row.ID.String(),
		BucketID:       row.BucketID.String(),
		ObjectKey:      row.ObjectKey,
		ContentType:    row.ContentType,
		SizeBytes:      row.SizeBytes,
		ChecksumSHA256: row.ChecksumSha256,
		CreatedAt:      createdAt,
	}
}

func toAuditLogListResponse(rows []db.CoreAuditLog) []auditLogResponse {
	result := make([]auditLogResponse, 0, len(rows))
	for _, row := range rows {
		result = append(result, toAuditLogResponse(row))
	}
	return result
}

func toAuditLogResponse(row db.CoreAuditLog) auditLogResponse {
	metadata := map[string]any{}
	_ = json.Unmarshal(row.Metadata, &metadata)
	createdAt := time.Time{}
	if row.CreatedAt.Valid {
		createdAt = row.CreatedAt.Time
	}
	return auditLogResponse{
		ID:           row.ID.String(),
		CreatedAt:    createdAt,
		Action:       row.Action,
		ResourceType: row.ResourceType,
		ResourceID:   row.ResourceID,
		RequestID:    row.RequestID,
		Metadata:     metadata,
	}
}

func toCollectionListResponse(rows []db.CoreCollection) []collectionResponse {
	result := make([]collectionResponse, 0, len(rows))
	for _, row := range rows {
		result = append(result, toCollectionResponse(row))
	}
	return result
}

func toCollectionResponse(row db.CoreCollection) collectionResponse {
	schema := map[string]any{}
	_ = json.Unmarshal(row.Schema, &schema)
	return collectionResponse{
		ID:          row.ID.String(),
		ProjectID:   row.ProjectID.String(),
		Slug:        row.Slug,
		Name:        row.Name,
		Description: row.Description,
		Schema:      schema,
		CreatedAt:   row.CreatedAt.Time,
		UpdatedAt:   row.UpdatedAt.Time,
	}
}

func toDocumentListResponse(rows []db.CoreDocument) []documentResponse {
	result := make([]documentResponse, 0, len(rows))
	for _, row := range rows {
		result = append(result, toDocumentResponse(row))
	}
	return result
}

func toDocumentResponse(row db.CoreDocument) documentResponse {
	data := map[string]any{}
	_ = json.Unmarshal(row.Data, &data)
	return documentResponse{
		ID:           row.ID.String(),
		CollectionID: row.CollectionID.String(),
		Data:         data,
		CreatedAt:    row.CreatedAt.Time,
		UpdatedAt:    row.UpdatedAt.Time,
	}
}

func timestamptzPtr(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	t := value.Time
	return &t
}
