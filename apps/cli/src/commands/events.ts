import { AutomationService } from "@primora/api-client";

import { loadConfig } from "../config.js";
import { CliError, configureClient, requireAuth, requireProject } from "../http.js";
import { isJson, printJson } from "../out.js";

interface EventsSendOptions {
  project?: string;
  data?: string;
  json?: boolean;
}

export async function cmdEventsSend(type: string, options: EventsSendOptions): Promise<void> {
  if (!type.startsWith("custom.")) {
    throw new CliError(
      `Invalid event type "${type}".`,
      "Client events must live in the custom.* namespace — e.g. custom.deploy.done",
    );
  }
  let data: Record<string, unknown> = {};
  if (options.data) {
    try {
      const parsed = JSON.parse(options.data);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new CliError("--data must be a JSON object.", `Got: ${options.data.slice(0, 60)}`);
      }
      data = parsed;
    } catch (e) {
      if (e instanceof CliError) throw e;
      throw new CliError("--data is not valid JSON.", (e as Error).message);
    }
  }

  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);
  const projectId = requireProject(cfg, options.project);

  const res = await AutomationService.publishProjectEvent({
    projectId,
    requestBody: { type, data },
  });
  if (isJson(options)) {
    printJson(res);
    return;
  }
  console.log(`Published ${res.published ?? type} — realtime subscribers, matching webhooks, and event_pattern functions fire.`);
}
