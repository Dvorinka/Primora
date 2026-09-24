package services

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// dockerRunner executes functions in an ephemeral, locked-down container:
// no network, read-only rootfs, memory/CPU/pid caps, non-root, all
// capabilities dropped. The source is passed through the environment as
// base64 and materialized inside the container's tmpfs — no bind mount,
// so this works on Docker Desktop (VM daemon) and remote daemons where
// host paths aren't shared. The payload arrives on stdin — same contract
// as execRunner, but user code no longer inherits backend privileges.
// Requires the Docker socket (compose: mount /var/run/docker.sock) — the
// documented trade-off: socket access is root-equivalent on the host, so
// this driver isolates function code, not operators.
type dockerRunner struct {
	timeout   time.Duration
	maxOutput int64
	images    map[string]string // runtime -> image ref
}

// maxFnSourceBytes caps function source for the docker driver — the source
// travels in the container spec (env), which kernels limit to ~2 MB total;
// 256 KiB keeps argv+env comfortably inside it.
const maxFnSourceBytes = 256 << 10

func NewDockerRunner(timeout time.Duration, maxOutput int64) *dockerRunner {
	return &dockerRunner{
		timeout:   timeout,
		maxOutput: maxOutput,
		images: map[string]string{
			"bun":  "oven/bun:1.3.14",
			"deno": "denoland/deno:2.5.6",
		},
	}
}

func (r *dockerRunner) Run(ctx context.Context, runtime, code string, payload json.RawMessage) FunctionResult {
	image, ok := r.images[runtime]
	if !ok {
		return FunctionResult{Status: "error", Stderr: "no container image configured for runtime " + runtime}
	}
	if len(code) > maxFnSourceBytes {
		return FunctionResult{Status: "error", Stderr: fmt.Sprintf("function source exceeds %d KiB docker-driver limit", maxFnSourceBytes>>10)}
	}
	if _, err := exec.LookPath("docker"); err != nil {
		return FunctionResult{Status: "error", Stderr: "FUNCTIONS_DRIVER=docker but docker CLI not found"}
	}

	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	// Named container so a timed-out client doesn't orphan a running fn.
	var suffix [4]byte
	_, _ = rand.Read(suffix[:])
	name := "primora-fn-" + hex.EncodeToString(suffix[:])

	// Write source inside the container, then run it. base64 keeps the
	// code inert data — it is decoded by the shell, never interpreted.
	entrypoint := fmt.Sprintf(
		`echo "$PRIMORA_CODE" | base64 -d > /tmp/fn.ts && %s /tmp/fn.ts`,
		map[bool]string{true: "deno run --no-prompt", false: "bun run"}[runtime == "deno"],
	)

	args := []string{
		"run", "--rm", "-i", "--name", name,
		"--network", "none",
		"--memory", "128m", "--memory-swap", "128m",
		"--cpus", "0.5",
		"--pids-limit", "64",
		"--read-only",
		"--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",
		"--cap-drop", "ALL",
		"--security-opt", "no-new-privileges",
		"--user", "65534:65534",
		"-e", "PRIMORA_CODE=" + base64.StdEncoding.EncodeToString([]byte(code)),
		"-e", "PRIMORA_PAYLOAD=" + string(payload),
		"-e", "PRIMORA_FUNCTION_RUNTIME=" + runtime,
		"--entrypoint", "sh",
		image, "-c", entrypoint,
	}

	cmd := exec.CommandContext(ctx, "docker", args...)
	cmd.Stdin = bytes.NewReader(payload)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &limitedWriter{w: &stdout, max: r.maxOutput}
	cmd.Stderr = &limitedWriter{w: &stderr, max: r.maxOutput}

	// ctx cancel kills the docker CLI but the daemon keeps the container
	// running — force-remove it so a stuck function can't linger.
	done := make(chan struct{})
	go func() {
		select {
		case <-ctx.Done():
			_ = exec.Command("docker", "rm", "-f", name).Run()
		case <-done:
		}
	}()
	defer close(done)

	start := time.Now()
	runErr := cmd.Run()
	duration := time.Since(start).Milliseconds()

	res := FunctionResult{
		Status:     "success",
		Stdout:     stdout.String(),
		Stderr:     stderr.String(),
		DurationMs: duration,
	}
	if ctx.Err() == context.DeadlineExceeded {
		res.Status = "timeout"
		res.Stderr = strings.TrimSpace(res.Stderr + "\nexecution timed out")
		return res
	}
	if runErr != nil {
		res.Status = "error"
		if exitErr, ok := runErr.(*exec.ExitError); ok {
			code := int32(exitErr.ExitCode())
			res.ExitCode = &code
		} else {
			res.Stderr = strings.TrimSpace(fmt.Sprintf("%v\n%s", runErr, res.Stderr))
		}
	}
	return res
}
