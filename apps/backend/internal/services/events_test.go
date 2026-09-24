package services

import "testing"

func TestCustomEventTypeRe(t *testing.T) {
	good := []string{"custom.ping", "custom.deploy.done", "custom.a", "custom.x-y_z.9"}
	bad := []string{
		"", "custom", "custom.", "document.created", "CUSTOM.ping",
		"custom.Ping", "custom..x", "custom.-x", "custom." + string(rune(0x20)) + "x",
		"custom." + string(make([]byte, 64)),
	}
	for _, s := range good {
		if !customEventTypeRe.MatchString(s) {
			t.Errorf("expected %q to match", s)
		}
	}
	for _, s := range bad {
		if customEventTypeRe.MatchString(s) {
			t.Errorf("expected %q to be rejected", s)
		}
	}
}
