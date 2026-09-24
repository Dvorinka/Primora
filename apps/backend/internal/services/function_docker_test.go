package services

import (
	"context"
	"encoding/json"
	"os/exec"
	"strings"
	"testing"
	"time"
)

func dockerAvailable(t *testing.T) {
	t.Helper()
	if _, err := exec.LookPath("docker"); err != nil {
		t.Skip("docker CLI not installed")
	}
	if err := exec.Command("docker", "info").Run(); err != nil {
		t.Skip("docker daemon not reachable")
	}
	// The test pulls the runtime image on first run.
	if err := exec.Command("docker", "image", "inspect", "oven/bun:1.3.14").Run(); err != nil {
		t.Skip("oven/bun:1.3.14 image not pulled")
	}
}

func TestDockerRunnerRunsCode(t *testing.T) {
	dockerAvailable(t)
	r := NewDockerRunner(30*time.Second, 65536)
	res := r.Run(context.Background(), "bun",
		`const p = JSON.parse(await new Response(Bun.stdin.stream()).text()); console.log("hi " + p.name);`,
		json.RawMessage(`{"name":"sandbox"}`))
	if res.Status != "success" {
		t.Fatalf("status = %q stderr = %q", res.Status, res.Stderr)
	}
	if !strings.Contains(res.Stdout, "hi sandbox") {
		t.Fatalf("stdout = %q", res.Stdout)
	}
}

func TestDockerRunnerIsolatesNetwork(t *testing.T) {
	dockerAvailable(t)
	r := NewDockerRunner(30*time.Second, 65536)
	// --network none: even a DNS/connect attempt must fail inside.
	res := r.Run(context.Background(), "bun",
		`try { await fetch("http://169.254.169.254/"); console.log("NET-OPEN") } catch { console.log("NET-CLOSED") }`,
		json.RawMessage(`{}`))
	if !strings.Contains(res.Stdout, "NET-CLOSED") {
		t.Fatalf("network should be unreachable, stdout = %q stderr = %q status = %q", res.Stdout, res.Stderr, res.Status)
	}
}

func TestDockerRunnerTimesOut(t *testing.T) {
	dockerAvailable(t)
	r := NewDockerRunner(2*time.Second, 65536)
	res := r.Run(context.Background(), "bun", `while (true) {}`, json.RawMessage(`{}`))
	if res.Status != "timeout" {
		t.Fatalf("status = %q", res.Status)
	}
}
