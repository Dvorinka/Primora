package services

import (
	"strings"
	"testing"
)

func TestValidLoginApp(t *testing.T) {
	ok := []string{"primora", "MyApp", "app.local", "stripe-dashboard", "a"}
	bad := []string{"", "has space", "http://localhost:3000", "/etc/passwd", "..", "-leading", "a/b"}
	for _, app := range ok {
		if !validLoginApp(app) {
			t.Errorf("validLoginApp(%q) = false", app)
		}
	}
	for _, app := range bad {
		if validLoginApp(app) {
			t.Errorf("validLoginApp(%q) = true", app)
		}
	}
	if !validLoginApp(strings.Repeat("a", 64)) {
		t.Error("64-char app id rejected")
	}
	if validLoginApp(strings.Repeat("a", 65)) {
		t.Error("65-char app id accepted")
	}
}
