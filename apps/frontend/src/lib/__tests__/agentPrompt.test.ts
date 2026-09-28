import { describe, expect, it } from "vitest";

import { buildAgentPrompt } from "../agent-prompt";

const base = {
  baseUrl: "https://primora.example.com",
  projectId: "proj-123",
  projectName: "Production API",
  projectSlug: "production-api",
  apiKey: "prm_abcd_secretkey",
};

describe("buildAgentPrompt", () => {
  const prompt = buildAgentPrompt(base);

  it("embeds credentials verbatim", () => {
    expect(prompt).toContain(`PRIMORA_BASE_URL=${base.baseUrl}`);
    expect(prompt).toContain(`PRIMORA_API_KEY=${base.apiKey}`);
    expect(prompt).toContain(`PRIMORA_PROJECT=${base.projectId}`);
  });

  it("points ingest at the deployment's API base", () => {
    expect(prompt).toContain(`POST ${base.baseUrl}/api/v1/ingest`);
    expect(prompt).not.toContain(`${base.baseUrl}/api/v1/api/v1`);
  });

  it("covers monitoring, databases and agent access", () => {
    expect(prompt).toContain("/db-connections");
    expect(prompt).toContain("deploy-markers");
    expect(prompt).toContain("PRIMORA_PROJECT");
    for (const t of ["postgres", "mysql", "mongodb", "redis"]) {
      expect(prompt).toContain(t);
    }
  });

  it("never fabricates database credentials", () => {
    expect(prompt).toMatch(/never fabricate credentials/i);
  });

  it("trims a trailing slash on the base URL", () => {
    const p = buildAgentPrompt({ ...base, baseUrl: "http://localhost/" });
    expect(p).toContain("PRIMORA_BASE_URL=http://localhost\n");
    expect(p).toContain("http://localhost/api/v1/ingest");
  });

  it("includes a concrete MCP stdio block when a source path is given", () => {
    const p = buildAgentPrompt({ ...base, primoraSourcePath: "/opt/Primora" });
    expect(p).toContain("/opt/Primora/apps/mcp/dist/server.js");
    expect(p).toContain('"mcpServers"');
  });
});
