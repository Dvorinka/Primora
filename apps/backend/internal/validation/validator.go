package validation

import (
	"fmt"
	"regexp"
	"strings"
)

var (
	// SlugRegex matches valid slugs (lowercase alphanumeric with hyphens)
	SlugRegex = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
	
	// EmailRegex matches valid email addresses
	EmailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	
	// BucketNameRegex matches valid bucket names
	BucketNameRegex = regexp.MustCompile(`^[a-z0-9][a-z0-9-]*[a-z0-9]$`)
)

// ValidationError represents a validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// Error implements the error interface
func (ve ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", ve.Field, ve.Message)
}

// ValidationErrors is a collection of validation errors
type ValidationErrors []ValidationError

// Error implements the error interface
func (ve ValidationErrors) Error() string {
	if len(ve) == 0 {
		return ""
	}
	
	var messages []string
	for _, err := range ve {
		messages = append(messages, err.Error())
	}
	return strings.Join(messages, "; ")
}

// Validator provides validation functions
type Validator struct {
	errors ValidationErrors
}

// New creates a new validator
func New() *Validator {
	return &Validator{
		errors: make(ValidationErrors, 0),
	}
}

// Required checks if a field is not empty
func (v *Validator) Required(field, value string) *Validator {
	if strings.TrimSpace(value) == "" {
		v.errors = append(v.errors, ValidationError{
			Field:   field,
			Message: "is required",
		})
	}
	return v
}

// MinLength checks if a field meets minimum length
func (v *Validator) MinLength(field, value string, min int) *Validator {
	if len(value) < min {
		v.errors = append(v.errors, ValidationError{
			Field:   field,
			Message: fmt.Sprintf("must be at least %d characters", min),
		})
	}
	return v
}

// MaxLength checks if a field doesn't exceed maximum length
func (v *Validator) MaxLength(field, value string, max int) *Validator {
	if len(value) > max {
		v.errors = append(v.errors, ValidationError{
			Field:   field,
			Message: fmt.Sprintf("must not exceed %d characters", max),
		})
	}
	return v
}

// Email checks if a field is a valid email
func (v *Validator) Email(field, value string) *Validator {
	if value != "" && !EmailRegex.MatchString(value) {
		v.errors = append(v.errors, ValidationError{
			Field:   field,
			Message: "must be a valid email address",
		})
	}
	return v
}

// Slug checks if a field is a valid slug
func (v *Validator) Slug(field, value string) *Validator {
	if value != "" && !SlugRegex.MatchString(value) {
		v.errors = append(v.errors, ValidationError{
			Field:   field,
			Message: "must be a valid slug (lowercase letters, numbers, and hyphens)",
		})
	}
	return v
}

// BucketName checks if a field is a valid bucket name
func (v *Validator) BucketName(field, value string) *Validator {
	if value != "" {
		if !BucketNameRegex.MatchString(value) {
			v.errors = append(v.errors, ValidationError{
				Field:   field,
				Message: "must be a valid bucket name (lowercase letters, numbers, and hyphens, cannot start or end with hyphen)",
			})
		}
		if len(value) < 3 || len(value) > 63 {
			v.errors = append(v.errors, ValidationError{
				Field:   field,
				Message: "must be between 3 and 63 characters",
			})
		}
	}
	return v
}

// OneOf checks if a field value is one of the allowed values
func (v *Validator) OneOf(field, value string, allowed []string) *Validator {
	if value != "" {
		found := false
		for _, a := range allowed {
			if value == a {
				found = true
				break
			}
		}
		if !found {
			v.errors = append(v.errors, ValidationError{
				Field:   field,
				Message: fmt.Sprintf("must be one of: %s", strings.Join(allowed, ", ")),
			})
		}
	}
	return v
}

// Custom adds a custom validation error
func (v *Validator) Custom(field, message string) *Validator {
	v.errors = append(v.errors, ValidationError{
		Field:   field,
		Message: message,
	})
	return v
}

// Valid returns true if there are no validation errors
func (v *Validator) Valid() bool {
	return len(v.errors) == 0
}

// Errors returns all validation errors
func (v *Validator) Errors() ValidationErrors {
	return v.errors
}

// FirstError returns the first validation error or nil
func (v *Validator) FirstError() error {
	if len(v.errors) > 0 {
		return v.errors[0]
	}
	return nil
}
