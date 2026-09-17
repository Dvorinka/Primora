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
	Scopes         []string
}

func (a *Actor) IsUser() bool {
	return a != nil && a.Type == ActorTypeUser
}

func (a *Actor) IsAPIKey() bool {
	return a != nil && a.Type == ActorTypeAPIKey
}

// HasScope reports whether the actor may perform work requiring `need`.
// User actors are always allowed — scopes constrain API keys only.
// Scope semantics: admin unlocks everything; write unlocks read + ingest +
// non-admin mutations; read and ingest unlock only themselves.
func (a *Actor) HasScope(need string) bool {
	if a == nil {
		return false
	}
	if a.IsUser() {
		return true
	}
	for _, s := range a.Scopes {
		switch s {
		case "admin":
			return true
		case "write":
			if need == "read" || need == "write" || need == "ingest" {
				return true
			}
		case "read":
			if need == "read" {
				return true
			}
		case "ingest":
			if need == "ingest" {
				return true
			}
		}
	}
	return false
}
