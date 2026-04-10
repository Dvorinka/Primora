package models

import "github.com/google/uuid"

type ActorType string

const (
	ActorTypeUser   ActorType = "user"
	ActorTypeAPIKey ActorType = "api_key"
)

type Actor struct {
	Type           ActorType
	UserID         *uuid.UUID
	AuthSubject    string
	Email          string
	EmailVerified  bool
	Name           string
	SessionID      string
	ProjectID      *uuid.UUID
	OrganizationID *uuid.UUID
	APIKeyID       *uuid.UUID
	APIKeyPrefix   string
}

func (a *Actor) IsUser() bool {
	return a != nil && a.Type == ActorTypeUser
}

func (a *Actor) IsAPIKey() bool {
	return a != nil && a.Type == ActorTypeAPIKey
}
