package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
	"github.com/tdvorak/primora/apps/backend/internal/models"
	"github.com/tdvorak/primora/apps/backend/internal/repositories"
	"github.com/tdvorak/primora/apps/backend/internal/storage"
)

type PlatformService struct {
	repo      *repositories.CoreRepository
	store     *storage.LocalStore
	mailer    *Mailer
	publicURL string
}

type BootstrapInput struct {
	OrganizationName string  `json:"organizationName" validate:"required,min=2"`
	OrganizationSlug string  `json:"organizationSlug" validate:"required,min=2"`
	ProjectName      string  `json:"projectName" validate:"required,min=2"`
	ProjectSlug      string  `json:"projectSlug" validate:"required,min=2"`
	Description      *string `json:"description"`
}

type CreateProjectInput struct {
	Name        string  `json:"name" validate:"required,min=2"`
	Slug        string  `json:"slug" validate:"required,min=2"`
	Description *string `json:"description"`
}

type CreateOrganizationInput struct {
	Name string `json:"name" validate:"required,min=2"`
	Slug string `json:"slug" validate:"required,min=2"`
}

type UpdateOrganizationInput struct {
	Name string `json:"name" validate:"required,min=2"`
	Slug string `json:"slug" validate:"required,min=2"`
}

type UpdateProjectInput struct {
	Name        string  `json:"name" validate:"required,min=2"`
	Slug        string  `json:"slug" validate:"required,min=2"`
	Description *string `json:"description"`
}

type CreateInvitationInput struct {
	Email       string  `json:"email" validate:"required,email"`
	OrgRole     string  `json:"orgRole" validate:"required,oneof=owner admin member"`
	ProjectID   *string `json:"projectId"`
	ProjectRole *string `json:"projectRole" validate:"omitempty,oneof=admin developer viewer"`
	RedirectURL *string `json:"redirectUrl"`
}

type CreateAPIKeyInput struct {
	Name string `json:"name" validate:"required,min=2"`
}

type CreateBucketInput struct {
	Name       string `json:"name" validate:"required,min=2"`
	Slug       string `json:"slug" validate:"required,min=2"`
	Visibility string `json:"visibility" validate:"required,oneof=private public"`
}

type UpdateBucketInput struct {
	Name       string `json:"name" validate:"required,min=2"`
	Slug       string `json:"slug" validate:"required,min=2"`
	Visibility string `json:"visibility" validate:"required,oneof=private public"`
}

type UpdateOrganizationMemberRoleInput struct {
	Role string `json:"role" validate:"required,oneof=owner admin member"`
}

type UpdateProjectMemberRoleInput struct {
	Role string `json:"role" validate:"required,oneof=admin developer viewer"`
}

type AcceptInvitationInput struct {
	Token string `json:"token" validate:"required"`
}

type UpdateObjectInput struct {
	NewObjectKey        string  `json:"newObjectKey" validate:"required,min=1"`
	DestinationBucketID *string `json:"destinationBucketId"`
}

type CopyObjectInput struct {
	ObjectKey           string  `json:"objectKey" validate:"required,min=1"`
	NewObjectKey        string  `json:"newObjectKey" validate:"required,min=1"`
	DestinationBucketID *string `json:"destinationBucketId"`
}

type CreateCollectionInput struct {
	Slug        string         `json:"slug" validate:"required,min=2"`
	Name        string         `json:"name" validate:"required,min=2"`
	Description *string        `json:"description"`
	Schema      map[string]any `json:"schema"`
}

type UpdateCollectionInput struct {
	Name        *string         `json:"name" validate:"omitempty,min=2"`
	Description *string         `json:"description"`
	Schema      map[string]any `json:"schema"`
}

type CreateDocumentInput struct {
	Data map[string]any `json:"data" validate:"required"`
}

type UpdateDocumentInput struct {
	Data map[string]any `json:"data" validate:"required"`
}

type PlatformSummary struct {
	User          CoreUserSummary            `json:"user"`
	Organizations []OrganizationWithProjects `json:"organizations"`
}

type CoreUserSummary struct {
	ID            uuid.UUID `json:"id"`
	AuthSubject   string    `json:"authSubject"`
	Email         string    `json:"email"`
	Name          string    `json:"name"`
	EmailVerified bool      `json:"emailVerified"`
}

type OrganizationWithProjects struct {
	ID             uuid.UUID        `json:"id"`
	Name           string           `json:"name"`
	Slug           string           `json:"slug"`
	MembershipRole string           `json:"membershipRole"`
	Projects       []ProjectSummary `json:"projects"`
}

type ProjectSummary struct {
	ID             uuid.UUID `json:"id"`
	Name           string    `json:"name"`
	Slug           string    `json:"slug"`
	Description    *string   `json:"description,omitempty"`
	MembershipRole *string   `json:"membershipRole,omitempty"`
}

type ProjectOverview struct {
	ProjectID              uuid.UUID  `json:"project_id"`
	OrganizationID         uuid.UUID  `json:"organization_id"`
	ProjectSlug            string     `json:"project_slug"`
	ProjectName            string     `json:"project_name"`
	MemberCount            int64      `json:"member_count"`
	ActiveAPIKeyCount      int64      `json:"active_api_key_count"`
	BucketCount            int64      `json:"bucket_count"`
	ObjectCount            int64      `json:"object_count"`
	ObjectBytesTotal       int64      `json:"object_bytes_total"`
	PendingInvitationCount int64      `json:"pending_invitation_count"`
	AuditEvents24h         int64      `json:"audit_events_24h"`
	LastAuditAt            *time.Time `json:"last_audit_at,omitempty"`
}

type OrganizationMemberSummary struct {
	UserID        uuid.UUID `json:"user_id"`
	Email         string    `json:"email"`
	Name          string    `json:"name"`
	EmailVerified bool      `json:"email_verified"`
	Role          string    `json:"role"`
	JoinedAt      time.Time `json:"joined_at"`
}

type ProjectMemberSummary struct {
	UserID        uuid.UUID `json:"user_id"`
	Email         string    `json:"email"`
	Name          string    `json:"name"`
	EmailVerified bool      `json:"email_verified"`
	Role          string    `json:"role"`
	JoinedAt      time.Time `json:"joined_at"`
}

type InvitationSummary struct {
	ID              uuid.UUID  `json:"id"`
	OrganizationID  uuid.UUID  `json:"organization_id"`
	ProjectID       *uuid.UUID `json:"project_id"`
	ProjectName     *string    `json:"project_name"`
	Email           string     `json:"email"`
	OrgRole         string     `json:"org_role"`
	ProjectRole     *string    `json:"project_role"`
	ExpiresAt       time.Time  `json:"expires_at"`
	AcceptedAt      *time.Time `json:"accepted_at"`
	InvitedByUserID *uuid.UUID `json:"invited_by_user_id"`
	CreatedAt       time.Time  `json:"created_at"`
	Status          string     `json:"status"`
}

func NewPlatformService(repo *repositories.CoreRepository, store *storage.LocalStore, mailer *Mailer, publicURL string) *PlatformService {
	return &PlatformService{repo: repo, store: store, mailer: mailer, publicURL: publicURL}
}

func (s *PlatformService) Me(ctx context.Context, actor *models.Actor) (PlatformSummary, error) {
	if actor.UserID == nil {
		return PlatformSummary{}, errors.New("user actor required")
	}
	user, err := s.repo.Queries().GetUserByAuthSubject(ctx, actor.AuthSubject)
	if err != nil {
		return PlatformSummary{}, err
	}
	orgs, err := s.repo.Queries().ListOrganizationsForUser(ctx, *actor.UserID)
	if err != nil {
		return PlatformSummary{}, err
	}
	response := PlatformSummary{
		User: CoreUserSummary{
			ID:            user.ID,
			AuthSubject:   user.AuthSubject,
			Email:         user.Email,
			Name:          user.Name,
			EmailVerified: user.EmailVerified,
		},
		Organizations: make([]OrganizationWithProjects, 0, len(orgs)),
	}
	for _, org := range orgs {
		projects, err := s.repo.Queries().ListProjectsForOrganization(ctx, db.ListProjectsForOrganizationParams{
			OrganizationID: org.ID,
			UserID:         *actor.UserID,
			Btrim:          "",
		})
		if err != nil {
			return PlatformSummary{}, err
		}
		item := OrganizationWithProjects{
			ID:             org.ID,
			Name:           org.Name,
			Slug:           org.Slug,
			MembershipRole: org.MembershipRole,
			Projects:       make([]ProjectSummary, 0, len(projects)),
		}
		for _, project := range projects {
			var membershipRole *string
			if project.MembershipRole.Valid {
				role := string(project.MembershipRole.CoreProjectRole)
				membershipRole = &role
			}
			item.Projects = append(item.Projects, ProjectSummary{
				ID:             project.ID,
				Name:           project.Name,
				Slug:           project.Slug,
				Description:    project.Description,
				MembershipRole: membershipRole,
			})
		}
		response.Organizations = append(response.Organizations, item)
	}
	return response, nil
}

func (s *PlatformService) Bootstrap(ctx context.Context, actor *models.Actor, input BootstrapInput, requestID string) (db.BootstrapOrganizationRow, error) {
	if actor.UserID == nil {
		return db.BootstrapOrganizationRow{}, errors.New("user actor required")
	}
	count, err := s.repo.CountOrganizations(ctx)
	if err != nil {
		return db.BootstrapOrganizationRow{}, err
	}
	if count > 0 {
		return db.BootstrapOrganizationRow{}, fmt.Errorf("bootstrap already completed")
	}
	var result db.BootstrapOrganizationRow
	err = s.repo.WithTx(ctx, func(q *db.Queries) error {
		row, err := q.BootstrapOrganization(ctx, db.BootstrapOrganizationParams{
			Slug:        normalizeSlug(input.OrganizationSlug),
			Name:        strings.TrimSpace(input.OrganizationName),
			UserID:      *actor.UserID,
			Slug_2:      normalizeSlug(input.ProjectSlug),
			Name_2:      strings.TrimSpace(input.ProjectName),
			Description: input.Description,
		})
		if err != nil {
			return err
		}
		if _, err := q.CreateAuditLog(ctx, newAuditParams(row.OrganizationID, row.ProjectID, actor, requestID, "platform.bootstrap", "platform", "bootstrap", map[string]any{
			"organizationSlug": row.OrganizationSlug,
			"projectSlug":      row.ProjectSlug,
		})); err != nil {
			return err
		}
		result = row
		return nil
	})
	return result, err
}

func (s *PlatformService) ListOrganizations(ctx context.Context, actor *models.Actor) ([]db.ListOrganizationsForUserRow, error) {
	if actor.UserID == nil {
		return nil, errors.New("user actor required")
	}
	return s.repo.Queries().ListOrganizationsForUser(ctx, *actor.UserID)
}

func (s *PlatformService) CreateOrganization(ctx context.Context, actor *models.Actor, input CreateOrganizationInput, requestID string) (db.CoreOrganization, error) {
	if actor.UserID == nil {
		return db.CoreOrganization{}, errors.New("user actor required")
	}
	var organization db.CoreOrganization
	err := s.repo.WithTx(ctx, func(q *db.Queries) error {
		row, err := q.CreateOrganization(ctx, db.CreateOrganizationParams{
			Slug: normalizeSlug(input.Slug),
			Name: strings.TrimSpace(input.Name),
		})
		if err != nil {
			return err
		}
		if _, err := q.AddOrganizationMember(ctx, db.AddOrganizationMemberParams{
			OrganizationID: row.ID,
			UserID:         *actor.UserID,
			Role:           "owner",
		}); err != nil {
			return err
		}
		if _, err := q.CreateAuditLog(ctx, newAuditParams(row.ID, uuid.Nil, actor, requestID, "organization.created", "organization", row.ID.String(), map[string]any{
			"slug": row.Slug,
		})); err != nil {
			return err
		}
		organization = row
		return nil
	})
	return organization, err
}

func (s *PlatformService) UpdateOrganization(ctx context.Context, actor *models.Actor, organizationID uuid.UUID, input UpdateOrganizationInput, requestID string) (db.CoreOrganization, error) {
	if err := s.requireOrganizationRole(ctx, actor, organizationID, "owner", "admin"); err != nil {
		return db.CoreOrganization{}, err
	}
	updated, err := s.repo.Queries().UpdateOrganizationByID(ctx, db.UpdateOrganizationByIDParams{
		ID:   organizationID,
		Slug: normalizeSlug(input.Slug),
		Name: strings.TrimSpace(input.Name),
	})
	if err != nil {
		return db.CoreOrganization{}, err
	}
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(organizationID, uuid.Nil, actor, requestID, "organization.updated", "organization", organizationID.String(), map[string]any{
		"slug": updated.Slug,
		"name": updated.Name,
	}))
	return updated, nil
}

func (s *PlatformService) DeleteOrganization(ctx context.Context, actor *models.Actor, organizationID uuid.UUID, requestID string) error {
	if err := s.requireOrganizationRole(ctx, actor, organizationID, "owner"); err != nil {
		return err
	}
	bucketIDs, err := s.repo.Queries().ListBucketsForOrganization(ctx, organizationID)
	if err != nil {
		return err
	}
	if err := s.repo.WithTx(ctx, func(q *db.Queries) error {
		deleted, err := q.DeleteOrganizationByID(ctx, organizationID)
		if err != nil {
			return err
		}
		if _, err := q.CreateAuditLog(ctx, newAuditParams(uuid.Nil, uuid.Nil, actor, requestID, "organization.deleted", "organization", deleted.ID.String(), map[string]any{
			"slug": deleted.Slug,
			"name": deleted.Name,
		})); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return err
	}
	for _, bucketID := range bucketIDs {
		_ = s.store.DeleteBucket(bucketID.String())
	}
	return nil
}

func (s *PlatformService) ListProjects(ctx context.Context, actor *models.Actor, organizationID uuid.UUID, query string) ([]db.ListProjectsForOrganizationRow, error) {
	if err := s.requireOrganizationRole(ctx, actor, organizationID, "owner", "admin", "member"); err != nil {
		return nil, err
	}
	if actor.UserID == nil {
		return nil, errors.New("user actor required")
	}
	return s.repo.Queries().ListProjectsForOrganization(ctx, db.ListProjectsForOrganizationParams{
		OrganizationID: organizationID,
		UserID:         *actor.UserID,
		Btrim:          query,
	})
}

func (s *PlatformService) ListOrganizationMembers(ctx context.Context, actor *models.Actor, organizationID uuid.UUID) ([]OrganizationMemberSummary, error) {
	if err := s.requireOrganizationRole(ctx, actor, organizationID, "owner", "admin", "member"); err != nil {
		return nil, err
	}
	if actor.UserID == nil {
		return nil, errors.New("user actor required")
	}
	rows, err := s.repo.Queries().ListOrganizationMembers(ctx, organizationID)
	if err != nil {
		return nil, err
	}
	items := make([]OrganizationMemberSummary, 0, len(rows))
	for _, row := range rows {
		items = append(items, OrganizationMemberSummary{
			UserID:        row.UserID,
			Email:         row.Email,
			Name:          row.Name,
			EmailVerified: row.EmailVerified,
			Role:          row.Role,
			JoinedAt:      row.CreatedAt.Time,
		})
	}
	return items, nil
}

func (s *PlatformService) UpdateOrganizationMemberRole(ctx context.Context, actor *models.Actor, organizationID, userID uuid.UUID, input UpdateOrganizationMemberRoleInput, requestID string) (OrganizationMemberSummary, error) {
	if err := s.requireOrganizationRole(ctx, actor, organizationID, "owner"); err != nil {
		return OrganizationMemberSummary{}, err
	}
	if actor.UserID == nil {
		return OrganizationMemberSummary{}, errors.New("user actor required")
	}
	current, err := s.repo.Queries().GetOrganizationMembership(ctx, db.GetOrganizationMembershipParams{
		OrganizationID: organizationID,
		UserID:         userID,
	})
	if err != nil {
		return OrganizationMemberSummary{}, err
	}
	if current.Role == "owner" && input.Role != "owner" {
		owners, err := s.repo.Queries().CountOrganizationOwners(ctx, organizationID)
		if err != nil {
			return OrganizationMemberSummary{}, err
		}
		if owners <= 1 {
			return OrganizationMemberSummary{}, fmt.Errorf("organization must retain at least one owner")
		}
	}
	updated, err := s.repo.Queries().UpdateOrganizationMemberRole(ctx, db.UpdateOrganizationMemberRoleParams{
		OrganizationID: organizationID,
		UserID:         userID,
		Role:           input.Role,
	})
	if err != nil {
		return OrganizationMemberSummary{}, err
	}
	user, err := s.repo.Queries().GetUserByID(ctx, userID)
	if err != nil {
		return OrganizationMemberSummary{}, err
	}
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(organizationID, uuid.Nil, actor, requestID, "organization.member.role_updated", "organization_member", userID.String(), map[string]any{
		"oldRole": current.Role,
		"newRole": updated.Role,
	}))
	return OrganizationMemberSummary{
		UserID:        user.ID,
		Email:         user.Email,
		Name:          user.Name,
		EmailVerified: user.EmailVerified,
		Role:          updated.Role,
		JoinedAt:      updated.CreatedAt.Time,
	}, nil
}

func (s *PlatformService) RemoveOrganizationMember(ctx context.Context, actor *models.Actor, organizationID, userID uuid.UUID, requestID string) error {
	if err := s.requireOrganizationRole(ctx, actor, organizationID, "owner"); err != nil {
		return err
	}
	if actor.UserID == nil {
		return errors.New("user actor required")
	}
	current, err := s.repo.Queries().GetOrganizationMembership(ctx, db.GetOrganizationMembershipParams{
		OrganizationID: organizationID,
		UserID:         userID,
	})
	if err != nil {
		return err
	}
	if current.Role == "owner" {
		owners, err := s.repo.Queries().CountOrganizationOwners(ctx, organizationID)
		if err != nil {
			return err
		}
		if owners <= 1 {
			return fmt.Errorf("organization must retain at least one owner")
		}
	}
	return s.repo.WithTx(ctx, func(q *db.Queries) error {
		if _, err := q.RemoveOrganizationMember(ctx, db.RemoveOrganizationMemberParams{
			OrganizationID: organizationID,
			UserID:         userID,
		}); err != nil {
			return err
		}
		if err := q.RemoveProjectMembershipsForOrganizationUser(ctx, db.RemoveProjectMembershipsForOrganizationUserParams{
			OrganizationID: organizationID,
			UserID:         userID,
		}); err != nil {
			return err
		}
		_, err := q.CreateAuditLog(ctx, newAuditParams(organizationID, uuid.Nil, actor, requestID, "organization.member.removed", "organization_member", userID.String(), map[string]any{
			"oldRole": current.Role,
		}))
		return err
	})
}

func (s *PlatformService) ListProjectMembers(ctx context.Context, actor *models.Actor, projectID uuid.UUID) ([]ProjectMemberSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	if actor.UserID == nil {
		return nil, errors.New("user actor required")
	}
	rows, err := s.repo.Queries().ListProjectMembers(ctx, projectID)
	if err != nil {
		return nil, err
	}
	items := make([]ProjectMemberSummary, 0, len(rows))
	for _, row := range rows {
		items = append(items, ProjectMemberSummary{
			UserID:        row.UserID,
			Email:         row.Email,
			Name:          row.Name,
			EmailVerified: row.EmailVerified,
			Role:          row.Role,
			JoinedAt:      row.CreatedAt.Time,
		})
	}
	return items, nil
}

func (s *PlatformService) GetProjectOverview(ctx context.Context, actor *models.Actor, projectID uuid.UUID) (ProjectOverview, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return ProjectOverview{}, err
	}
	row, err := s.repo.Queries().GetProjectOverview(ctx, projectID)
	if err != nil {
		return ProjectOverview{}, err
	}
	return ProjectOverview{
		ProjectID:              row.ProjectID,
		OrganizationID:         row.OrganizationID,
		ProjectSlug:            row.ProjectSlug,
		ProjectName:            row.ProjectName,
		MemberCount:            row.MemberCount,
		ActiveAPIKeyCount:      row.ActiveApiKeyCount,
		BucketCount:            row.BucketCount,
		ObjectCount:            row.ObjectCount,
		ObjectBytesTotal:       row.ObjectBytesTotal,
		PendingInvitationCount: row.PendingInvitationCount,
		AuditEvents24h:         row.AuditEvents24h,
		LastAuditAt:            projectOverviewLastAuditAt(row.LastAuditAt),
	}, nil
}

func projectOverviewLastAuditAt(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	timestamp := value.Time
	return &timestamp
}

func (s *PlatformService) UpdateProjectMemberRole(ctx context.Context, actor *models.Actor, projectID, userID uuid.UUID, input UpdateProjectMemberRoleInput, requestID string) (ProjectMemberSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin"); err != nil {
		return ProjectMemberSummary{}, err
	}
	if actor.UserID == nil {
		return ProjectMemberSummary{}, errors.New("user actor required")
	}
	current, err := s.repo.Queries().GetProjectMembership(ctx, db.GetProjectMembershipParams{
		ProjectID: projectID,
		UserID:    userID,
	})
	if err != nil {
		return ProjectMemberSummary{}, err
	}
	if current.Role == "admin" && input.Role != "admin" {
		adminCount, err := s.repo.Queries().CountProjectAdmins(ctx, projectID)
		if err != nil {
			return ProjectMemberSummary{}, err
		}
		if adminCount <= 1 {
			return ProjectMemberSummary{}, fmt.Errorf("project must retain at least one admin")
		}
	}
	updated, err := s.repo.Queries().UpdateProjectMemberRole(ctx, db.UpdateProjectMemberRoleParams{
		ProjectID: projectID,
		UserID:    userID,
		Role:      input.Role,
	})
	if err != nil {
		return ProjectMemberSummary{}, err
	}
	user, err := s.repo.Queries().GetUserByID(ctx, userID)
	if err != nil {
		return ProjectMemberSummary{}, err
	}
	project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
	if err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "project.member.role_updated", "project_member", userID.String(), map[string]any{
			"oldRole": current.Role,
			"newRole": updated.Role,
		}))
	}
	return ProjectMemberSummary{
		UserID:        user.ID,
		Email:         user.Email,
		Name:          user.Name,
		EmailVerified: user.EmailVerified,
		Role:          updated.Role,
		JoinedAt:      updated.CreatedAt.Time,
	}, nil
}

func (s *PlatformService) RemoveProjectMember(ctx context.Context, actor *models.Actor, projectID, userID uuid.UUID, requestID string) error {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin"); err != nil {
		return err
	}
	if actor.UserID == nil {
		return errors.New("user actor required")
	}
	current, err := s.repo.Queries().GetProjectMembership(ctx, db.GetProjectMembershipParams{
		ProjectID: projectID,
		UserID:    userID,
	})
	if err != nil {
		return err
	}
	if current.Role == "admin" {
		adminCount, err := s.repo.Queries().CountProjectAdmins(ctx, projectID)
		if err != nil {
			return err
		}
		if adminCount <= 1 {
			return fmt.Errorf("project must retain at least one admin")
		}
	}
	if _, err := s.repo.Queries().RemoveProjectMember(ctx, db.RemoveProjectMemberParams{
		ProjectID: projectID,
		UserID:    userID,
	}); err != nil {
		return err
	}
	project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
	if err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "project.member.removed", "project_member", userID.String(), map[string]any{
			"oldRole": current.Role,
		}))
	}
	return nil
}

func (s *PlatformService) CreateProject(ctx context.Context, actor *models.Actor, organizationID uuid.UUID, input CreateProjectInput, requestID string) (db.CoreProject, error) {
	if err := s.requireOrganizationRole(ctx, actor, organizationID, "owner", "admin"); err != nil {
		return db.CoreProject{}, err
	}
	if actor.UserID == nil {
		return db.CoreProject{}, errors.New("user actor required")
	}
	var project db.CoreProject
	err := s.repo.WithTx(ctx, func(q *db.Queries) error {
		row, err := q.CreateProject(ctx, db.CreateProjectParams{
			OrganizationID: organizationID,
			Slug:           normalizeSlug(input.Slug),
			Name:           strings.TrimSpace(input.Name),
			Description:    input.Description,
		})
		if err != nil {
			return err
		}
		if _, err := q.AddProjectMember(ctx, db.AddProjectMemberParams{
			ProjectID: row.ID,
			UserID:    *actor.UserID,
			Role:      "admin",
		}); err != nil {
			return err
		}
		if _, err := q.CreateAuditLog(ctx, newAuditParams(organizationID, row.ID, actor, requestID, "project.created", "project", row.ID.String(), map[string]any{
			"slug": row.Slug,
		})); err != nil {
			return err
		}
		project = row
		return nil
	})
	return project, err
}

func (s *PlatformService) UpdateProject(ctx context.Context, actor *models.Actor, projectID uuid.UUID, input UpdateProjectInput, requestID string) (db.CoreProject, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin"); err != nil {
		return db.CoreProject{}, err
	}
	project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
	if err != nil {
		return db.CoreProject{}, err
	}
	updated, err := s.repo.Queries().UpdateProjectByID(ctx, db.UpdateProjectByIDParams{
		ID:          projectID,
		Slug:        normalizeSlug(input.Slug),
		Name:        strings.TrimSpace(input.Name),
		Description: input.Description,
	})
	if err != nil {
		return db.CoreProject{}, err
	}
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "project.updated", "project", projectID.String(), map[string]any{
		"slug": updated.Slug,
		"name": updated.Name,
	}))
	return updated, nil
}

func (s *PlatformService) DeleteProject(ctx context.Context, actor *models.Actor, projectID uuid.UUID, requestID string) error {
	project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
	if err != nil {
		return err
	}
	if err := s.requireOrganizationRole(ctx, actor, project.OrganizationID, "owner", "admin"); err != nil {
		return err
	}
	buckets, err := s.repo.Queries().ListBucketsForProject(ctx, db.ListBucketsForProjectParams{
		ProjectID: projectID,
		Btrim:     "",
	})
	if err != nil {
		return err
	}
	if err := s.repo.WithTx(ctx, func(q *db.Queries) error {
		if _, err := q.DeleteProjectByID(ctx, projectID); err != nil {
			return err
		}
		if _, err := q.CreateAuditLog(ctx, newAuditParams(project.OrganizationID, uuid.Nil, actor, requestID, "project.deleted", "project", project.ID.String(), map[string]any{
			"slug": project.Slug,
		})); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return err
	}
	for _, bucket := range buckets {
		_ = s.store.DeleteBucket(bucket.ID.String())
	}
	return nil
}

func (s *PlatformService) CreateInvitation(ctx context.Context, actor *models.Actor, organizationID uuid.UUID, input CreateInvitationInput, requestID string) (map[string]any, error) {
	if err := s.requireOrganizationRole(ctx, actor, organizationID, "owner", "admin"); err != nil {
		return nil, err
	}
	if actor.UserID == nil {
		return nil, errors.New("user actor required")
	}
	var projectUUID pgtype.UUID
	var projectRole db.NullCoreProjectRole
	projectIDRaw := ""
	if input.ProjectID != nil {
		projectIDRaw = strings.TrimSpace(*input.ProjectID)
	}
	projectRoleRaw := ""
	if input.ProjectRole != nil {
		projectRoleRaw = strings.TrimSpace(*input.ProjectRole)
	}
	if projectIDRaw == "" && projectRoleRaw != "" {
		return nil, fmt.Errorf("invalid invitation project scope")
	}
	if projectIDRaw != "" && projectRoleRaw == "" {
		return nil, fmt.Errorf("project role is required when project id is provided")
	}
	if projectIDRaw != "" {
		projectID, err := uuid.Parse(projectIDRaw)
		if err != nil {
			return nil, fmt.Errorf("parse project id: %w", err)
		}
		project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
		if err != nil {
			return nil, err
		}
		if project.OrganizationID != organizationID {
			return nil, fmt.Errorf("invalid invitation project scope")
		}
		projectUUID = pgtype.UUID{Bytes: projectID, Valid: true}
		projectRole = db.NullCoreProjectRole{
			CoreProjectRole: db.CoreProjectRole(projectRoleRaw),
			Valid:           true,
		}
	}
	token, err := randomToken(32)
	if err != nil {
		return nil, fmt.Errorf("generate invitation token: %w", err)
	}
	tokenHash := digestString(token)
	var invitation db.CoreProjectInvitation
	err = s.repo.WithTx(ctx, func(q *db.Queries) error {
		row, err := q.CreateInvitation(ctx, db.CreateInvitationParams{
			OrganizationID:  organizationID,
			ProjectID:       projectUUID,
			Lower:           strings.ToLower(strings.TrimSpace(input.Email)),
			OrgRole:         input.OrgRole,
			ProjectRole:     projectRole,
			TokenHash:       tokenHash,
			ExpiresAt:       pgtype.Timestamptz{Time: time.Now().Add(72 * time.Hour), Valid: true},
			InvitedByUserID: pgtype.UUID{Bytes: *actor.UserID, Valid: true},
		})
		if err != nil {
			return err
		}
		if _, err := q.CreateAuditLog(ctx, newAuditParams(organizationID, pgUUIDOrNil(projectUUID), actor, requestID, "invitation.created", "invitation", row.ID.String(), map[string]any{
			"email": row.Email,
		})); err != nil {
			return err
		}
		invitation = row
		return nil
	})
	if err != nil {
		return nil, err
	}

	baseInviteURL := s.publicURL + "/invite"
	if input.RedirectURL != nil && *input.RedirectURL != "" {
		baseInviteURL = *input.RedirectURL
	}
	inviteURL, err := url.JoinPath(strings.TrimRight(baseInviteURL, "/"), token)
	if err != nil {
		inviteURL = strings.TrimRight(baseInviteURL, "/") + "/" + token
	}
	if err := s.mailer.SendInvitation(ctx, invitation.Email, "Primora", inviteURL); err != nil {
		return nil, err
	}
	return map[string]any{
		"id":        invitation.ID,
		"email":     invitation.Email,
		"expiresAt": invitation.ExpiresAt.Time,
	}, nil
}

func (s *PlatformService) ListInvitations(ctx context.Context, actor *models.Actor, organizationID uuid.UUID) ([]InvitationSummary, error) {
	if err := s.requireOrganizationRole(ctx, actor, organizationID, "owner", "admin"); err != nil {
		return nil, err
	}
	rows, err := s.repo.Queries().ListInvitationsForOrganization(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	items := make([]InvitationSummary, 0, len(rows))
	for _, row := range rows {
		var projectID *uuid.UUID
		if row.ProjectID.Valid {
			id := uuid.UUID(row.ProjectID.Bytes)
			projectID = &id
		}
		var projectRole *string
		if row.ProjectRole.Valid {
			role := string(row.ProjectRole.CoreProjectRole)
			projectRole = &role
		}
		var acceptedAt *time.Time
		if row.AcceptedAt.Valid {
			accepted := row.AcceptedAt.Time
			acceptedAt = &accepted
		}
		var invitedByUserID *uuid.UUID
		if row.InvitedByUserID.Valid {
			userID := uuid.UUID(row.InvitedByUserID.Bytes)
			invitedByUserID = &userID
		}

		status := "pending"
		if acceptedAt != nil {
			status = "accepted"
		} else if row.ExpiresAt.Valid && row.ExpiresAt.Time.Before(now) {
			status = "expired"
		}

		items = append(items, InvitationSummary{
			ID:              row.ID,
			OrganizationID:  row.OrganizationID,
			ProjectID:       projectID,
			ProjectName:     row.ProjectName,
			Email:           row.Email,
			OrgRole:         row.OrgRole,
			ProjectRole:     projectRole,
			ExpiresAt:       row.ExpiresAt.Time,
			AcceptedAt:      acceptedAt,
			InvitedByUserID: invitedByUserID,
			CreatedAt:       row.CreatedAt.Time,
			Status:          status,
		})
	}
	return items, nil
}

func (s *PlatformService) RevokeInvitation(ctx context.Context, actor *models.Actor, organizationID, invitationID uuid.UUID, requestID string) error {
	if err := s.requireOrganizationRole(ctx, actor, organizationID, "owner", "admin"); err != nil {
		return err
	}
	invitation, err := s.repo.Queries().GetInvitationByIDForOrganization(ctx, db.GetInvitationByIDForOrganizationParams{
		OrganizationID: organizationID,
		ID:             invitationID,
	})
	if err != nil {
		return err
	}
	if invitation.AcceptedAt.Valid {
		return fmt.Errorf("invitation already accepted")
	}
	deleted, err := s.repo.Queries().DeletePendingInvitationByIDForOrganization(ctx, db.DeletePendingInvitationByIDForOrganizationParams{
		OrganizationID: organizationID,
		ID:             invitationID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("invitation already accepted")
		}
		return err
	}
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(organizationID, pgUUIDOrNil(deleted.ProjectID), actor, requestID, "invitation.revoked", "invitation", invitationID.String(), map[string]any{
		"email": deleted.Email,
	}))
	return nil
}

func (s *PlatformService) AcceptInvitation(ctx context.Context, actor *models.Actor, input AcceptInvitationInput, requestID string) error {
	if actor.UserID == nil {
		return errors.New("user actor required")
	}
	tokenHash := digestString(input.Token)
	return s.repo.WithTx(ctx, func(q *db.Queries) error {
		invite, err := q.GetInvitationByTokenHash(ctx, tokenHash)
		if err != nil {
			return err
		}
		if invite.AcceptedAt.Valid {
			return fmt.Errorf("invitation already accepted")
		}
		if invite.ExpiresAt.Time.Before(time.Now()) {
			return fmt.Errorf("invitation expired")
		}
		if !strings.EqualFold(invite.Email, actor.Email) {
			return fmt.Errorf("invitation email does not match authenticated user")
		}
		if _, err := q.AddOrganizationMember(ctx, db.AddOrganizationMemberParams{
			OrganizationID: invite.OrganizationID,
			UserID:         *actor.UserID,
			Role:           invite.OrgRole,
		}); err != nil {
			return err
		}
		if invite.ProjectID.Valid && invite.ProjectRole.Valid {
			project, err := q.GetProjectByID(ctx, invite.ProjectID.Bytes)
			if err != nil {
				return err
			}
			if project.OrganizationID != invite.OrganizationID {
				return fmt.Errorf("invalid invitation project scope")
			}
			if _, err := q.AddProjectMember(ctx, db.AddProjectMemberParams{
				ProjectID: invite.ProjectID.Bytes,
				UserID:    *actor.UserID,
				Role:      string(invite.ProjectRole.CoreProjectRole),
			}); err != nil {
				return err
			}
		}
		if _, err := q.MarkInvitationAccepted(ctx, invite.ID); err != nil {
			return err
		}
		_, err = q.CreateAuditLog(ctx, newAuditParams(invite.OrganizationID, pgUUIDOrNil(invite.ProjectID), actor, requestID, "invitation.accepted", "invitation", invite.ID.String(), map[string]any{
			"email": invite.Email,
		}))
		return err
	})
}

func (s *PlatformService) ListAPIKeys(ctx context.Context, actor *models.Actor, projectID uuid.UUID) ([]db.CoreApiKey, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin"); err != nil {
		return nil, err
	}
	return s.repo.Queries().ListAPIKeysForProject(ctx, projectID)
}

func (s *PlatformService) CreateAPIKey(ctx context.Context, actor *models.Actor, projectID uuid.UUID, input CreateAPIKeyInput, requestID string) (map[string]any, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin"); err != nil {
		return nil, err
	}
	if actor.UserID == nil {
		return nil, errors.New("user actor required")
	}
	prefixSuffix, err := randomString(8)
	if err != nil {
		return nil, fmt.Errorf("generate api key prefix: %w", err)
	}
	keySuffix, err := randomString(24)
	if err != nil {
		return nil, fmt.Errorf("generate api key secret: %w", err)
	}
	prefix := "prm_" + prefixSuffix
	rawKey := prefix + "_" + keySuffix
	secretHash := sha256.Sum256([]byte(rawKey))
	row, err := s.repo.Queries().CreateAPIKey(ctx, db.CreateAPIKeyParams{
		ProjectID:       projectID,
		Name:            strings.TrimSpace(input.Name),
		Prefix:          prefix,
		SecretHash:      secretHash[:],
		CreatedByUserID: pgtype.UUID{Bytes: *actor.UserID, Valid: true},
	})
	if err != nil {
		return nil, err
	}
	project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
	if err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "api_key.created", "api_key", row.ID.String(), map[string]any{
			"name": row.Name,
		}))
	}
	return map[string]any{
		"id":     row.ID,
		"prefix": row.Prefix,
		"secret": rawKey,
		"name":   row.Name,
	}, nil
}

func (s *PlatformService) RevokeAPIKey(ctx context.Context, actor *models.Actor, projectID, apiKeyID uuid.UUID, requestID string) error {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin"); err != nil {
		return err
	}
	if actor.UserID == nil {
		return errors.New("user actor required")
	}
	key, err := s.repo.Queries().GetAPIKeyByIDForProject(ctx, db.GetAPIKeyByIDForProjectParams{
		ProjectID: projectID,
		ID:        apiKeyID,
	})
	if err != nil {
		return err
	}
	if key.RevokedAt.Valid {
		return fmt.Errorf("api key already revoked")
	}
	if _, err := s.repo.Queries().RevokeAPIKey(ctx, db.RevokeAPIKeyParams{
		ProjectID: projectID,
		ID:        apiKeyID,
	}); err != nil {
		return err
	}
	project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
	if err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "api_key.revoked", "api_key", apiKeyID.String(), map[string]any{}))
	}
	return nil
}

func (s *PlatformService) ListBuckets(ctx context.Context, actor *models.Actor, projectID uuid.UUID, query string) ([]db.CoreBucket, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	return s.repo.Queries().ListBucketsForProject(ctx, db.ListBucketsForProjectParams{
		ProjectID: projectID,
		Btrim:     query,
	})
}

func (s *PlatformService) CreateBucket(ctx context.Context, actor *models.Actor, projectID uuid.UUID, input CreateBucketInput, requestID string) (db.CoreBucket, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return db.CoreBucket{}, err
	}
	var createdBy pgtype.UUID
	if actor.UserID != nil {
		createdBy = pgtype.UUID{Bytes: *actor.UserID, Valid: true}
	}
	row, err := s.repo.Queries().CreateBucket(ctx, db.CreateBucketParams{
		ProjectID:       projectID,
		Slug:            normalizeSlug(input.Slug),
		Name:            strings.TrimSpace(input.Name),
		Visibility:      input.Visibility,
		CreatedByUserID: createdBy,
	})
	if err != nil {
		return db.CoreBucket{}, err
	}
	project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
	if err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "bucket.created", "bucket", row.ID.String(), map[string]any{
			"slug": row.Slug,
		}))
	}
	return row, nil
}

func (s *PlatformService) UpdateBucket(ctx context.Context, actor *models.Actor, bucketID uuid.UUID, input UpdateBucketInput, requestID string) (db.CoreBucket, error) {
	bucket, err := s.repo.Queries().GetBucketByID(ctx, bucketID)
	if err != nil {
		return db.CoreBucket{}, err
	}
	if err := s.requireProjectRole(ctx, actor, bucket.ProjectID, "admin", "developer"); err != nil {
		return db.CoreBucket{}, err
	}
	updated, err := s.repo.Queries().UpdateBucketByID(ctx, db.UpdateBucketByIDParams{
		ID:         bucketID,
		Slug:       normalizeSlug(input.Slug),
		Name:       strings.TrimSpace(input.Name),
		Visibility: input.Visibility,
	})
	if err != nil {
		return db.CoreBucket{}, err
	}
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(bucket.OrganizationID, bucket.ProjectID, actor, requestID, "bucket.updated", "bucket", bucketID.String(), map[string]any{
		"slug":       updated.Slug,
		"name":       updated.Name,
		"visibility": updated.Visibility,
	}))
	return updated, nil
}

func (s *PlatformService) DeleteBucket(ctx context.Context, actor *models.Actor, bucketID uuid.UUID, requestID string) error {
	bucket, err := s.repo.Queries().GetBucketByID(ctx, bucketID)
	if err != nil {
		return err
	}
	if err := s.requireProjectRole(ctx, actor, bucket.ProjectID, "admin", "developer"); err != nil {
		return err
	}
	if err := s.repo.WithTx(ctx, func(q *db.Queries) error {
		if _, err := q.DeleteBucketByID(ctx, bucketID); err != nil {
			return err
		}
		if _, err := q.CreateAuditLog(ctx, newAuditParams(bucket.OrganizationID, bucket.ProjectID, actor, requestID, "bucket.deleted", "bucket", bucketID.String(), map[string]any{
			"slug": bucket.Slug,
		})); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return err
	}
	_ = s.store.DeleteBucket(bucketID.String())
	return nil
}

func (s *PlatformService) UploadObject(ctx context.Context, actor *models.Actor, bucketID uuid.UUID, objectKey, contentType string, reader io.Reader, requestID string) (db.CoreBucketObject, error) {
	bucket, err := s.repo.Queries().GetBucketByID(ctx, bucketID)
	if err != nil {
		return db.CoreBucketObject{}, err
	}
	if err := s.requireBucketWrite(ctx, actor, bucket); err != nil {
		return db.CoreBucketObject{}, err
	}
	uploader := pgtype.UUID{}
	if actor != nil && actor.UserID != nil {
		uploader = pgtype.UUID{Bytes: *actor.UserID, Valid: true}
	}
	stored, err := s.store.Put(ctx, bucket.ID.String(), objectKey, reader)
	if err != nil {
		return db.CoreBucketObject{}, err
	}
	row, err := s.repo.Queries().CreateBucketObject(ctx, db.CreateBucketObjectParams{
		BucketID:         bucket.ID,
		ObjectKey:        objectKey,
		ContentType:      contentType,
		SizeBytes:        stored.SizeBytes,
		ChecksumSha256:   stored.SHA256Digest,
		StoragePath:      filepath.Clean(stored.Path),
		UploadedByUserID: uploader,
	})
	if err != nil {
		return db.CoreBucketObject{}, err
	}
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(bucket.OrganizationID, bucket.ProjectID, actor, requestID, "object.uploaded", "bucket_object", row.ID.String(), map[string]any{
		"bucketId": bucket.ID.String(),
		"key":      objectKey,
	}))
	return row, nil
}

func (s *PlatformService) ListObjects(ctx context.Context, actor *models.Actor, bucketID uuid.UUID, query string, limit, offset int32) ([]db.CoreBucketObject, error) {
	bucket, err := s.repo.Queries().GetBucketByID(ctx, bucketID)
	if err != nil {
		return nil, err
	}
	if err := s.requireBucketRead(ctx, actor, bucket); err != nil {
		return nil, err
	}
	return s.repo.Queries().ListBucketObjects(ctx, db.ListBucketObjectsParams{
		BucketID: bucketID,
		Btrim:    query,
		Limit:    limit,
		Offset:   offset,
	})
}

func (s *PlatformService) CountObjects(ctx context.Context, actor *models.Actor, bucketID uuid.UUID, query string) (int64, error) {
	bucket, err := s.repo.Queries().GetBucketByID(ctx, bucketID)
	if err != nil {
		return 0, err
	}
	if err := s.requireBucketRead(ctx, actor, bucket); err != nil {
		return 0, err
	}
	return s.repo.Queries().CountBucketObjects(ctx, db.CountBucketObjectsParams{
		BucketID: bucketID,
		Btrim:    query,
	})
}

func (s *PlatformService) GetObject(ctx context.Context, actor *models.Actor, bucketID uuid.UUID, objectKey string) (db.CoreBucketObject, io.ReadCloser, error) {
	bucket, err := s.repo.Queries().GetBucketByID(ctx, bucketID)
	if err != nil {
		return db.CoreBucketObject{}, nil, err
	}
	if err := s.requireBucketRead(ctx, actor, bucket); err != nil {
		return db.CoreBucketObject{}, nil, err
	}
	object, err := s.repo.Queries().GetBucketObjectByKey(ctx, db.GetBucketObjectByKeyParams{
		BucketID:  bucketID,
		ObjectKey: objectKey,
	})
	if err != nil {
		return db.CoreBucketObject{}, nil, err
	}
	file, _, err := s.store.Open(bucketID.String(), objectKey)
	if err != nil {
		return db.CoreBucketObject{}, nil, err
	}
	return object, file, nil
}

func (s *PlatformService) UpdateObject(ctx context.Context, actor *models.Actor, bucketID uuid.UUID, objectKey string, input UpdateObjectInput, requestID string) (db.CoreBucketObject, error) {
	sourceBucket, err := s.repo.Queries().GetBucketByID(ctx, bucketID)
	if err != nil {
		return db.CoreBucketObject{}, err
	}
	if err := s.requireBucketWrite(ctx, actor, sourceBucket); err != nil {
		return db.CoreBucketObject{}, err
	}
	destinationBucket := sourceBucket
	destinationBucketID := sourceBucket.ID
	if input.DestinationBucketID != nil {
		destinationID := strings.TrimSpace(*input.DestinationBucketID)
		if destinationID != "" {
			parsedDestinationID, err := uuid.Parse(destinationID)
			if err != nil {
				return db.CoreBucketObject{}, fmt.Errorf("invalid destination bucket id")
			}
			targetBucket, err := s.repo.Queries().GetBucketByID(ctx, parsedDestinationID)
			if err != nil {
				return db.CoreBucketObject{}, err
			}
			if targetBucket.ProjectID != sourceBucket.ProjectID {
				return db.CoreBucketObject{}, fmt.Errorf("invalid move scope: destination bucket must belong to the same project")
			}
			if err := s.requireBucketWrite(ctx, actor, targetBucket); err != nil {
				return db.CoreBucketObject{}, err
			}
			destinationBucket = targetBucket
			destinationBucketID = parsedDestinationID
		}
	}
	newObjectKey := strings.TrimSpace(input.NewObjectKey)
	if newObjectKey == "" {
		return db.CoreBucketObject{}, fmt.Errorf("new object key is required")
	}
	oldObject, err := s.repo.Queries().GetBucketObjectByKey(ctx, db.GetBucketObjectByKeyParams{
		BucketID:  bucketID,
		ObjectKey: objectKey,
	})
	if err != nil {
		return db.CoreBucketObject{}, err
	}
	if destinationBucketID == sourceBucket.ID && newObjectKey == oldObject.ObjectKey {
		return oldObject, nil
	}
	newStoragePath, err := s.store.MoveBetweenBuckets(sourceBucket.ID.String(), destinationBucketID.String(), objectKey, newObjectKey)
	if err != nil {
		return db.CoreBucketObject{}, err
	}
	updated, err := s.repo.Queries().MoveBucketObject(ctx, db.MoveBucketObjectParams{
		BucketID:    bucketID,
		ObjectKey:   objectKey,
		BucketID_2:  destinationBucketID,
		ObjectKey_2: newObjectKey,
		StoragePath: filepath.Clean(newStoragePath),
	})
	if err != nil {
		_, _ = s.store.MoveBetweenBuckets(destinationBucketID.String(), sourceBucket.ID.String(), newObjectKey, objectKey)
		return db.CoreBucketObject{}, err
	}
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(sourceBucket.OrganizationID, sourceBucket.ProjectID, actor, requestID, "object.moved", "bucket_object", updated.ID.String(), map[string]any{
		"sourceBucketId":      sourceBucket.ID.String(),
		"destinationBucketId": destinationBucket.ID.String(),
		"oldObjectKey":        oldObject.ObjectKey,
		"newObjectKey":        updated.ObjectKey,
	}))
	return updated, nil
}

func (s *PlatformService) CopyObject(ctx context.Context, actor *models.Actor, bucketID uuid.UUID, input CopyObjectInput, requestID string) (db.CoreBucketObject, error) {
	sourceBucket, err := s.repo.Queries().GetBucketByID(ctx, bucketID)
	if err != nil {
		return db.CoreBucketObject{}, err
	}
	if err := s.requireBucketRead(ctx, actor, sourceBucket); err != nil {
		return db.CoreBucketObject{}, err
	}
	sourceObjectKey := strings.TrimSpace(input.ObjectKey)
	if sourceObjectKey == "" {
		return db.CoreBucketObject{}, fmt.Errorf("object key is required")
	}
	newObjectKey := strings.TrimSpace(input.NewObjectKey)
	if newObjectKey == "" {
		return db.CoreBucketObject{}, fmt.Errorf("new object key is required")
	}
	sourceObject, err := s.repo.Queries().GetBucketObjectByKey(ctx, db.GetBucketObjectByKeyParams{
		BucketID:  sourceBucket.ID,
		ObjectKey: sourceObjectKey,
	})
	if err != nil {
		return db.CoreBucketObject{}, err
	}
	destinationBucket := sourceBucket
	destinationBucketID := sourceBucket.ID
	if input.DestinationBucketID != nil {
		destinationID := strings.TrimSpace(*input.DestinationBucketID)
		if destinationID != "" {
			parsedDestinationID, err := uuid.Parse(destinationID)
			if err != nil {
				return db.CoreBucketObject{}, fmt.Errorf("invalid destination bucket id")
			}
			targetBucket, err := s.repo.Queries().GetBucketByID(ctx, parsedDestinationID)
			if err != nil {
				return db.CoreBucketObject{}, err
			}
			if targetBucket.ProjectID != sourceBucket.ProjectID {
				return db.CoreBucketObject{}, fmt.Errorf("invalid copy scope: destination bucket must belong to the same project")
			}
			destinationBucket = targetBucket
			destinationBucketID = parsedDestinationID
		}
	}
	if err := s.requireBucketWrite(ctx, actor, destinationBucket); err != nil {
		return db.CoreBucketObject{}, err
	}
	sourceFile, _, err := s.store.Open(sourceBucket.ID.String(), sourceObjectKey)
	if err != nil {
		return db.CoreBucketObject{}, err
	}
	defer sourceFile.Close()
	stored, err := s.store.Put(ctx, destinationBucketID.String(), newObjectKey, sourceFile)
	if err != nil {
		return db.CoreBucketObject{}, err
	}
	uploader := pgtype.UUID{}
	if actor != nil && actor.UserID != nil {
		uploader = pgtype.UUID{Bytes: *actor.UserID, Valid: true}
	}
	created, err := s.repo.Queries().CreateBucketObject(ctx, db.CreateBucketObjectParams{
		BucketID:         destinationBucketID,
		ObjectKey:        newObjectKey,
		ContentType:      sourceObject.ContentType,
		SizeBytes:        stored.SizeBytes,
		ChecksumSha256:   stored.SHA256Digest,
		StoragePath:      filepath.Clean(stored.Path),
		UploadedByUserID: uploader,
	})
	if err != nil {
		_ = s.store.Delete(destinationBucketID.String(), newObjectKey)
		return db.CoreBucketObject{}, err
	}
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(sourceBucket.OrganizationID, sourceBucket.ProjectID, actor, requestID, "object.copied", "bucket_object", created.ID.String(), map[string]any{
		"sourceBucketId":      sourceBucket.ID.String(),
		"destinationBucketId": destinationBucket.ID.String(),
		"sourceObjectKey":     sourceObjectKey,
		"newObjectKey":        created.ObjectKey,
	}))
	return created, nil
}

func (s *PlatformService) DeleteObject(ctx context.Context, actor *models.Actor, bucketID uuid.UUID, objectKey, requestID string) error {
	bucket, err := s.repo.Queries().GetBucketByID(ctx, bucketID)
	if err != nil {
		return err
	}
	if err := s.requireBucketWrite(ctx, actor, bucket); err != nil {
		return err
	}
	object, err := s.repo.Queries().DeleteBucketObjectByKey(ctx, db.DeleteBucketObjectByKeyParams{
		BucketID:  bucketID,
		ObjectKey: objectKey,
	})
	if err != nil {
		return err
	}
	if err := s.store.Delete(bucketID.String(), objectKey); err != nil {
		return err
	}
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(bucket.OrganizationID, bucket.ProjectID, actor, requestID, "object.deleted", "bucket_object", object.ID.String(), map[string]any{
		"bucketId": bucketID.String(),
		"key":      objectKey,
	}))
	return nil
}

func (s *PlatformService) ListAuditLogs(
	ctx context.Context,
	actor *models.Actor,
	projectID uuid.UUID,
	query string,
	action string,
	limit,
	offset int32,
) ([]db.CoreAuditLog, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin"); err != nil {
		return nil, err
	}
	return s.repo.Queries().ListAuditLogsForProject(ctx, db.ListAuditLogsForProjectParams{
		ProjectID: pgtype.UUID{Bytes: projectID, Valid: true},
		Btrim:     query,
		Btrim_2:   action,
		Limit:     limit,
		Offset:    offset,
	})
}

func (s *PlatformService) CountAuditLogs(
	ctx context.Context,
	actor *models.Actor,
	projectID uuid.UUID,
	query string,
	action string,
) (int64, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin"); err != nil {
		return 0, err
	}
	return s.repo.Queries().CountAuditLogsForProject(ctx, db.CountAuditLogsForProjectParams{
		ProjectID: pgtype.UUID{Bytes: projectID, Valid: true},
		Btrim:     query,
		Btrim_2:   action,
	})
}

func (s *PlatformService) ListCollections(ctx context.Context, actor *models.Actor, projectID uuid.UUID) ([]db.CoreCollection, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	return s.repo.Queries().ListCollections(ctx, projectID)
}

func (s *PlatformService) GetCollection(ctx context.Context, actor *models.Actor, projectID, collectionID uuid.UUID) (db.CoreCollection, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return db.CoreCollection{}, err
	}
	collection, err := s.repo.Queries().GetCollectionByID(ctx, collectionID)
	if err != nil {
		return db.CoreCollection{}, err
	}
	if collection.ProjectID != projectID {
		return db.CoreCollection{}, fmt.Errorf("collection access denied")
	}
	return collection, nil
}

func (s *PlatformService) CreateCollection(ctx context.Context, actor *models.Actor, projectID uuid.UUID, input CreateCollectionInput, requestID string) (db.CoreCollection, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return db.CoreCollection{}, err
	}
	var createdBy pgtype.UUID
	if actor.UserID != nil {
		createdBy = pgtype.UUID{Bytes: *actor.UserID, Valid: true}
	}
	schemaBytes, _ := json.Marshal(input.Schema)
	row, err := s.repo.Queries().CreateCollection(ctx, db.CreateCollectionParams{
		ProjectID:       projectID,
		Slug:            normalizeSlug(input.Slug),
		Name:            strings.TrimSpace(input.Name),
		Description:     input.Description,
		Schema:          schemaBytes,
		CreatedByUserID: createdBy,
	})
	if err != nil {
		return db.CoreCollection{}, err
	}
	project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
	if err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "collection.created", "collection", row.ID.String(), map[string]any{
			"slug": row.Slug,
		}))
	}
	return row, nil
}

func (s *PlatformService) UpdateCollection(ctx context.Context, actor *models.Actor, projectID, collectionID uuid.UUID, input UpdateCollectionInput, requestID string) (db.CoreCollection, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return db.CoreCollection{}, err
	}
	current, err := s.repo.Queries().GetCollectionByID(ctx, collectionID)
	if err != nil {
		return db.CoreCollection{}, err
	}
	if current.ProjectID != projectID {
		return db.CoreCollection{}, fmt.Errorf("collection access denied")
	}

	name := current.Name
	if input.Name != nil {
		name = strings.TrimSpace(*input.Name)
	}
	description := current.Description
	if input.Description != nil {
		description = input.Description
	}
	schemaBytes := current.Schema
	if input.Schema != nil {
		schemaBytes, _ = json.Marshal(input.Schema)
	}

	updated, err := s.repo.Queries().UpdateCollection(ctx, db.UpdateCollectionParams{
		ID:          collectionID,
		ProjectID:   projectID,
		Name:        name,
		Description: description,
		Schema:      schemaBytes,
	})
	if err != nil {
		return db.CoreCollection{}, err
	}
	project, _ := s.repo.Queries().GetProjectByID(ctx, projectID)
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "collection.updated", "collection", collectionID.String(), map[string]any{
		"name": updated.Name,
	}))
	return updated, nil
}

func (s *PlatformService) DeleteCollection(ctx context.Context, actor *models.Actor, projectID, collectionID uuid.UUID, requestID string) error {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return err
	}
	current, err := s.repo.Queries().GetCollectionByID(ctx, collectionID)
	if err != nil {
		return err
	}
	if current.ProjectID != projectID {
		return fmt.Errorf("collection access denied")
	}

	if err := s.repo.Queries().DeleteCollection(ctx, db.DeleteCollectionParams{
		ID:        collectionID,
		ProjectID: projectID,
	}); err != nil {
		return err
	}
	project, _ := s.repo.Queries().GetProjectByID(ctx, projectID)
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "collection.deleted", "collection", collectionID.String(), map[string]any{
		"slug": current.Slug,
	}))
	return nil
}

func (s *PlatformService) ListDocuments(ctx context.Context, actor *models.Actor, collectionID uuid.UUID, limit, offset int32) ([]db.CoreDocument, error) {
	collection, err := s.repo.Queries().GetCollectionByID(ctx, collectionID)
	if err != nil {
		return nil, err
	}
	if err := s.requireProjectRole(ctx, actor, collection.ProjectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	return s.repo.Queries().ListDocuments(ctx, db.ListDocumentsParams{
		CollectionID: collectionID,
		Limit:        limit,
		Offset:       offset,
	})
}

func (s *PlatformService) CountDocuments(ctx context.Context, actor *models.Actor, collectionID uuid.UUID) (int64, error) {
	collection, err := s.repo.Queries().GetCollectionByID(ctx, collectionID)
	if err != nil {
		return 0, err
	}
	if err := s.requireProjectRole(ctx, actor, collection.ProjectID, "admin", "developer", "viewer"); err != nil {
		return 0, err
	}
	return s.repo.Queries().CountDocuments(ctx, collectionID)
}

func (s *PlatformService) GetDocument(ctx context.Context, actor *models.Actor, collectionID, documentID uuid.UUID) (db.CoreDocument, error) {
	collection, err := s.repo.Queries().GetCollectionByID(ctx, collectionID)
	if err != nil {
		return db.CoreDocument{}, err
	}
	if err := s.requireProjectRole(ctx, actor, collection.ProjectID, "admin", "developer", "viewer"); err != nil {
		return db.CoreDocument{}, err
	}
	return s.repo.Queries().GetDocumentByID(ctx, db.GetDocumentByIDParams{
		ID:           documentID,
		CollectionID: collectionID,
	})
}

func (s *PlatformService) CreateDocument(ctx context.Context, actor *models.Actor, collectionID uuid.UUID, input CreateDocumentInput, requestID string) (db.CoreDocument, error) {
	collection, err := s.repo.Queries().GetCollectionByID(ctx, collectionID)
	if err != nil {
		return db.CoreDocument{}, err
	}
	if err := s.requireProjectRole(ctx, actor, collection.ProjectID, "admin", "developer"); err != nil {
		return db.CoreDocument{}, err
	}
	var createdBy pgtype.UUID
	if actor.UserID != nil {
		createdBy = pgtype.UUID{Bytes: *actor.UserID, Valid: true}
	}
	dataBytes, _ := json.Marshal(input.Data)
	row, err := s.repo.Queries().CreateDocument(ctx, db.CreateDocumentParams{
		CollectionID:    collectionID,
		Data:            dataBytes,
		CreatedByUserID: createdBy,
	})
	if err != nil {
		return db.CoreDocument{}, err
	}
	project, _ := s.repo.Queries().GetProjectByID(ctx, collection.ProjectID)
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, collection.ProjectID, actor, requestID, "document.created", "document", row.ID.String(), map[string]any{
		"collectionId": collectionID.String(),
	}))
	return row, nil
}

func (s *PlatformService) UpdateDocument(ctx context.Context, actor *models.Actor, collectionID, documentID uuid.UUID, input UpdateDocumentInput, requestID string) (db.CoreDocument, error) {
	collection, err := s.repo.Queries().GetCollectionByID(ctx, collectionID)
	if err != nil {
		return db.CoreDocument{}, err
	}
	if err := s.requireProjectRole(ctx, actor, collection.ProjectID, "admin", "developer"); err != nil {
		return db.CoreDocument{}, err
	}
	dataBytes, _ := json.Marshal(input.Data)
	row, err := s.repo.Queries().UpdateDocument(ctx, db.UpdateDocumentParams{
		ID:           documentID,
		CollectionID: collectionID,
		Data:         dataBytes,
	})
	if err != nil {
		return db.CoreDocument{}, err
	}
	project, _ := s.repo.Queries().GetProjectByID(ctx, collection.ProjectID)
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, collection.ProjectID, actor, requestID, "document.updated", "document", documentID.String(), map[string]any{
		"collectionId": collectionID.String(),
	}))
	return row, nil
}

func (s *PlatformService) DeleteDocument(ctx context.Context, actor *models.Actor, collectionID, documentID uuid.UUID, requestID string) error {
	collection, err := s.repo.Queries().GetCollectionByID(ctx, collectionID)
	if err != nil {
		return err
	}
	if err := s.requireProjectRole(ctx, actor, collection.ProjectID, "admin", "developer"); err != nil {
		return err
	}
	if err := s.repo.Queries().DeleteDocument(ctx, db.DeleteDocumentParams{
		ID:           documentID,
		CollectionID: collectionID,
	}); err != nil {
		return err
	}
	project, _ := s.repo.Queries().GetProjectByID(ctx, collection.ProjectID)
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, collection.ProjectID, actor, requestID, "document.deleted", "document", documentID.String(), map[string]any{
		"collectionId": collectionID.String(),
	}))
	return nil
}

func (s *PlatformService) requireOrganizationRole(ctx context.Context, actor *models.Actor, organizationID uuid.UUID, allowedRoles ...string) error {
	if actor == nil {
		return errors.New("authentication required")
	}
	if actor.IsAPIKey() {
		if actor.OrganizationID != nil && *actor.OrganizationID == organizationID {
			return nil
		}
		return errors.New("organization access denied")
	}
	if actor.UserID == nil {
		return errors.New("user actor required")
	}
	membership, err := s.repo.Queries().GetOrganizationMembership(ctx, db.GetOrganizationMembershipParams{
		OrganizationID: organizationID,
		UserID:         *actor.UserID,
	})
	if err != nil {
		return err
	}
	if !containsRole(membership.Role, allowedRoles...) {
		return fmt.Errorf("organization role %s is insufficient", membership.Role)
	}
	return nil
}

func (s *PlatformService) requireProjectRole(ctx context.Context, actor *models.Actor, projectID uuid.UUID, allowedRoles ...string) error {
	if actor == nil {
		return errors.New("authentication required")
	}
	if actor.IsAPIKey() {
		if actor.ProjectID != nil && *actor.ProjectID == projectID {
			return nil
		}
		return errors.New("project access denied")
	}
	if actor.UserID == nil {
		return errors.New("user actor required")
	}
	membership, err := s.repo.Queries().GetProjectMembership(ctx, db.GetProjectMembershipParams{
		ProjectID: projectID,
		UserID:    *actor.UserID,
	})
	if err != nil {
		return err
	}
	if !containsRole(membership.Role, allowedRoles...) {
		return fmt.Errorf("project role %s is insufficient", membership.Role)
	}
	return nil
}

func (s *PlatformService) requireBucketRead(ctx context.Context, actor *models.Actor, bucket db.GetBucketByIDRow) error {
	if bucket.Visibility == "public" {
		return nil
	}
	return s.requireProjectRole(ctx, actor, bucket.ProjectID, "admin", "developer", "viewer")
}

func (s *PlatformService) requireBucketWrite(ctx context.Context, actor *models.Actor, bucket db.GetBucketByIDRow) error {
	return s.requireProjectRole(ctx, actor, bucket.ProjectID, "admin", "developer")
}

func containsRole(current string, allowed ...string) bool {
	for _, role := range allowed {
		if role == current {
			return true
		}
	}
	return false
}

func normalizeSlug(input string) string {
	slug := strings.ToLower(strings.TrimSpace(input))
	slug = strings.ReplaceAll(slug, " ", "-")
	return slug
}

func randomString(length int) (string, error) {
	const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
	buffer := make([]byte, length)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	for i := range buffer {
		buffer[i] = alphabet[int(buffer[i])%len(alphabet)]
	}
	return string(buffer), nil
}

func randomToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func digestString(input string) string {
	sum := sha256.Sum256([]byte(input))
	return hex.EncodeToString(sum[:])
}

func newAuditParams(orgID, projectID uuid.UUID, actor *models.Actor, requestID, action, resourceType, resourceID string, metadata map[string]any) db.CreateAuditLogParams {
	payload, _ := json.Marshal(metadata)
	params := db.CreateAuditLogParams{
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		Metadata:     payload,
		RequestID:    requestID,
	}
	if orgID != uuid.Nil {
		params.OrganizationID = pgtype.UUID{Bytes: orgID, Valid: true}
	}
	if projectID != uuid.Nil {
		params.ProjectID = pgtype.UUID{Bytes: projectID, Valid: true}
	}
	if actor != nil {
		if actor.UserID != nil {
			params.ActorUserID = pgtype.UUID{Bytes: *actor.UserID, Valid: true}
		}
		if actor.APIKeyID != nil {
			params.ActorApiKeyID = pgtype.UUID{Bytes: *actor.APIKeyID, Valid: true}
		}
	}
	return params
}

func pgUUIDOrNil(value pgtype.UUID) uuid.UUID {
	if value.Valid {
		return value.Bytes
	}
	return uuid.Nil
}
