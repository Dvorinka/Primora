// Package dbx bridges Primora to the DBX MCP server (@dbx-app/mcp-server).
// The server is spawned lazily as a persistent stdio subprocess; all database
// inspection and queries flow through its tools.
package dbx

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type Client struct {
	mu         sync.Mutex
	session    *mcp.ClientSession
	cmd        *exec.Cmd
	cmdLine    string
	dataDir    string
	logger     *slog.Logger
	registered map[string]bool
	lastErr    string
}

func NewClient(logger *slog.Logger, dataDir string) *Client {
	return &Client{logger: logger, dataDir: dataDir, registered: map[string]bool{}}
}

func (d *Client) connect(ctx context.Context) (*mcp.ClientSession, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.session != nil {
		return d.session, nil
	}
	// jarvis: exec.Command, not CommandContext — the subprocess must outlive the
	// request ctx or every HTTP request would SIGKILL it on return.
	var cmd *exec.Cmd
	if p, err := exec.LookPath("dbx-mcp"); err == nil {
		cmd = exec.Command(p)
		d.cmdLine = "dbx-mcp"
	} else if p, err := exec.LookPath("dbx-mcp-server"); err == nil {
		cmd = exec.Command(p)
		d.cmdLine = "dbx-mcp-server"
	} else {
		npx, err := exec.LookPath("npx")
		if err != nil {
			d.lastErr = "neither dbx-mcp binary nor npx found — install @dbx-app/mcp-server"
			return nil, fmt.Errorf("%s", d.lastErr)
		}
		cmd = exec.Command(npx, "-y", "@dbx-app/mcp-server")
		d.cmdLine = "npx -y @dbx-app/mcp-server"
	}
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if d.dataDir != "" {
		if err := os.MkdirAll(d.dataDir, 0o755); err != nil {
			return nil, fmt.Errorf("create dbx data dir: %w", err)
		}
		cmd.Env = append(os.Environ(), "DBX_DATA_DIR="+d.dataDir)
	}

	client := mcp.NewClient(&mcp.Implementation{Name: "primora", Version: "0.2.0"}, nil)
	sess, err := client.Connect(ctx, &mcp.CommandTransport{Command: cmd}, nil)
	if err != nil {
		d.lastErr = fmt.Sprintf("dbx spawn failed: %v %s", err, stderr.String())
		return nil, fmt.Errorf("%s", d.lastErr)
	}
	d.session = sess
	d.cmd = cmd
	d.registered = map[string]bool{}
	d.lastErr = ""
	return sess, nil
}

func (d *Client) reset() {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.session != nil {
		d.session.Close()
		d.session = nil
	}
	if d.cmd != nil && d.cmd.Process != nil {
		_ = d.cmd.Process.Kill()
	}
	d.cmd = nil
	d.registered = map[string]bool{}
}

// call invokes a DBX tool, transparently respawning the subprocess once on failure.
func (d *Client) call(ctx context.Context, tool string, args map[string]any) (string, error) {
	sess, err := d.connect(ctx)
	if err != nil {
		return "", err
	}
	res, err := sess.CallTool(ctx, &mcp.CallToolParams{Name: tool, Arguments: args})
	if err != nil {
		d.reset()
		sess, err2 := d.connect(ctx)
		if err2 != nil {
			return "", err
		}
		res, err = sess.CallTool(ctx, &mcp.CallToolParams{Name: tool, Arguments: args})
		if err != nil {
			return "", err
		}
	}
	if res.IsError {
		var msg string
		for _, c := range res.Content {
			if tc, ok := c.(*mcp.TextContent); ok {
				msg += tc.Text
			}
		}
		if msg == "" {
			msg = "dbx tool error"
		}
		return "", fmt.Errorf("%s", msg)
	}
	var texts []string
	for _, c := range res.Content {
		if tc, ok := c.(*mcp.TextContent); ok {
			texts = append(texts, tc.Text)
		}
	}
	return strings.Join(texts, "\n"), nil
}

// Call runs a DBX tool with a bounded timeout and returns its text output.
func (d *Client) Call(ctx context.Context, tool string, args map[string]any) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	return d.call(ctx, tool, args)
}

// EnsureConnection registers the connection in DBX storage when missing.
// Registration is cached per subprocess session and cleared on respawn.
func (d *Client) EnsureConnection(ctx context.Context, name string, args map[string]any) error {
	d.mu.Lock()
	if d.registered[name] {
		d.mu.Unlock()
		return nil
	}
	d.mu.Unlock()

	_, err := d.Call(ctx, "dbx_add_connection", args)
	if err == nil {
		d.mu.Lock()
		d.registered[name] = true
		d.mu.Unlock()
		return nil
	}
	// The add may have failed because the name is already in DBX storage —
	// verify with a list before surfacing the error.
	list, lerr := d.Call(ctx, "dbx_list_connections", nil)
	if lerr == nil {
		for _, row := range ParseConnectionRows(list) {
			if row.Name == name {
				d.mu.Lock()
				d.registered[name] = true
				d.mu.Unlock()
				return nil
			}
		}
	}
	return err
}

// RemoveConnection drops the connection from DBX storage, best-effort.
func (d *Client) RemoveConnection(ctx context.Context, name string) {
	_, _ = d.Call(ctx, "dbx_remove_connection", map[string]any{"connection_name": name})
	d.mu.Lock()
	delete(d.registered, name)
	d.mu.Unlock()
}

// Status reports whether the DBX subprocess can be spawned.
func (d *Client) Status(ctx context.Context) map[string]any {
	ctx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()
	if _, err := d.connect(ctx); err != nil {
		return map[string]any{
			"available": false,
			"reason":    err.Error(),
			"install":   "npm install -g @dbx-app/mcp-server   (https://github.com/t8y2/dbx)",
		}
	}
	d.mu.Lock()
	cmd := d.cmdLine
	d.mu.Unlock()
	return map[string]any{"available": true, "command": cmd}
}

// Close terminates the subprocess.
func (d *Client) Close() { d.reset() }

// --- response normalization: DBX tools return markdown tables / bullet lists ---

func splitMDRow(line string) []string {
	line = strings.TrimSpace(line)
	line = strings.TrimPrefix(line, "|")
	line = strings.TrimSuffix(line, "|")
	parts := strings.Split(line, "|")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts
}

func isMDSeparator(line string) bool {
	line = strings.TrimSpace(line)
	if !strings.HasPrefix(line, "|") {
		return false
	}
	for _, r := range line {
		if r != '|' && r != '-' && r != ':' && r != ' ' {
			return false
		}
	}
	return true
}

type MDTable struct {
	Columns []string   `json:"columns"`
	Rows    [][]string `json:"rows"`
	Note    string     `json:"note,omitempty"`
}

func ParseMDTable(text string) (*MDTable, string) {
	var cols []string
	var rows [][]string
	var rest []string
	for _, line := range strings.Split(text, "\n") {
		trim := strings.TrimSpace(line)
		switch {
		case strings.HasPrefix(trim, "|") && len(cols) == 0:
			cols = splitMDRow(trim)
		case isMDSeparator(trim):
			continue
		case strings.HasPrefix(trim, "|"):
			rows = append(rows, splitMDRow(trim))
		default:
			if trim != "" {
				rest = append(rest, trim)
			}
		}
	}
	if len(cols) == 0 {
		return nil, text
	}
	return &MDTable{Columns: cols, Rows: rows, Note: strings.Join(rest, "\n")}, text
}

type DBObject struct {
	Name string `json:"name"`
	Kind string `json:"kind"`
}

// ParseBullets handles "- name (KIND)" lists (dbx_list_tables, dbx_list_databases).
func ParseBullets(text string) []DBObject {
	var out []DBObject
	for _, line := range strings.Split(text, "\n") {
		trim := strings.TrimSpace(line)
		if !strings.HasPrefix(trim, "- ") {
			continue
		}
		item := strings.TrimPrefix(trim, "- ")
		kind := ""
		if i := strings.LastIndex(item, " ("); i > 0 && strings.HasSuffix(item, ")") {
			kind = item[i+2 : len(item)-1]
			item = item[:i]
		}
		out = append(out, DBObject{Name: item, Kind: kind})
	}
	return out
}

type ConnectionRow struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Host     string `json:"host"`
	Port     string `json:"port"`
	Database string `json:"database"`
	Group    string `json:"group"`
}

// ParseConnectionRows reads the `dbx_list_connections` markdown table.
func ParseConnectionRows(text string) []ConnectionRow {
	t, _ := ParseMDTable(text)
	if t == nil {
		return nil
	}
	idx := map[string]int{}
	for i, c := range t.Columns {
		idx[strings.ToLower(c)] = i
	}
	get := func(row []string, col string) string {
		if i, ok := idx[col]; ok && i < len(row) {
			return row[i]
		}
		return ""
	}
	out := []ConnectionRow{}
	for _, r := range t.Rows {
		out = append(out, ConnectionRow{
			ID: get(r, "id"), Name: get(r, "name"), Type: get(r, "type"),
			Host: get(r, "host"), Port: get(r, "port"), Database: get(r, "database"),
			Group: get(r, "group path"),
		})
	}
	return out
}
