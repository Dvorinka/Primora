package services

import (
	"bytes"
	"context"
	"strings"
	"testing"
	"time"
)

// These tests run the real bun binary — skipped when it is not installed,
// same convention as exec-dependent tests elsewhere.
func bunAvailable(t *testing.T) {
	t.Helper()
	r := NewExecRunner("auto", 5*time.Second, 4096)
	res := r.Run(context.Background(), "bun", `console.log("probe")`, nil)
	if strings.Contains(res.Stderr, "no functions runtime") || (res.Status == "error" && res.ExitCode == nil && strings.Contains(res.Stderr, "executable file not found")) {
		t.Skip("bun not installed")
	}
}

func TestExecRunnerSuccess(t *testing.T) {
	bunAvailable(t)
	r := NewExecRunner("auto", 10*time.Second, 4096)
	res := r.Run(context.Background(), "bun",
		`const p = JSON.parse(await new Response(Bun.stdin.stream()).text()); console.log("got:" + p.x);`,
		[]byte(`{"x":42}`))
	if res.Status != "success" {
		t.Fatalf("status=%s stderr=%s", res.Status, res.Stderr)
	}
	if !strings.Contains(res.Stdout, "got:42") {
		t.Fatalf("stdout=%q", res.Stdout)
	}
	if res.DurationMs <= 0 {
		t.Fatalf("duration=%d", res.DurationMs)
	}
}

func TestExecRunnerErrorCapturesStderr(t *testing.T) {
	bunAvailable(t)
	r := NewExecRunner("auto", 10*time.Second, 4096)
	res := r.Run(context.Background(), "bun", `throw new Error("test-boom")`, nil)
	if res.Status != "error" {
		t.Fatalf("status=%s", res.Status)
	}
	if res.ExitCode == nil || *res.ExitCode == 0 {
		t.Fatalf("exit=%v", res.ExitCode)
	}
	if !strings.Contains(res.Stderr, "test-boom") {
		t.Fatalf("stderr=%q", res.Stderr)
	}
}

func TestExecRunnerTimeout(t *testing.T) {
	bunAvailable(t)
	r := NewExecRunner("auto", 500*time.Millisecond, 4096)
	res := r.Run(context.Background(), "bun", `await new Promise(r => setTimeout(r, 10000))`, nil)
	if res.Status != "timeout" {
		t.Fatalf("status=%s", res.Status)
	}
}

func TestLimitedWriterCaps(t *testing.T) {
	var buf bytes.Buffer
	lw := &limitedWriter{w: &buf, max: 5}
	if n, err := lw.Write([]byte("hello world")); err != nil || n != 11 {
		t.Fatalf("write n=%d err=%v", n, err)
	}
	if buf.String() != "hello" {
		t.Fatalf("got %q", buf.String())
	}
}

func TestTriggerFromJobRun(t *testing.T) {
	for in, want := range map[string]string{
		"schedule": "schedule",
		"hook":     "hook",
		"manual":   "manual",
		"cli":      "schedule",
		"":         "schedule",
	} {
		if got := triggerFromJobRun(in); got != want {
			t.Fatalf("triggerFromJobRun(%q) = %q, want %q", in, got, want)
		}
	}
}
