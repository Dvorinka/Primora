import type { ScheduledJob, ScheduledJobRun } from "@primora/api-client";
import { AutomationService } from "@primora/api-client";

import { loadConfig } from "../config.js";
import { configureClient, requireAuth, requireProject } from "../http.js";
import { formatDate, isJson, printJson, printTable, success } from "../out.js";

interface JobOptions {
  project?: string;
  json?: boolean;
}

function jobRow(job: ScheduledJob): string[] {
  return [
    job.name,
    job.schedule,
    job.url,
    job.enabled ? "on" : "off",
    job.last_status ?? "—",
    job.last_run_at ? formatDate(job.last_run_at) : "never",
    job.enabled && job.next_run_at ? formatDate(job.next_run_at) : "—",
    job.id,
  ];
}

export async function cmdJobsList(options: JobOptions): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const projectId = requireProject(cfg, options.project);
  const page = await AutomationService.listScheduledJobs({ projectId });
  if (isJson(options)) {
    printJson(page);
  } else {
    printTable(
      ["NAME", "SCHEDULE", "URL", "ENABLED", "LAST", "LAST RUN", "NEXT RUN", "ID"],
      page.items.map(jobRow),
    );
  }
}

export async function cmdJobsCreate(
  name: string,
  options: JobOptions & {
    schedule?: string;
    url?: string;
    payload?: string;
    secret?: string;
    disabled?: boolean;
  },
): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  if (!options.schedule) throw new Error("pass --schedule, e.g. '*/15 * * * *' or '@every 1h'");
  if (!options.url) throw new Error("pass --url <https endpoint>");

  let payload: Record<string, unknown> | undefined;
  if (options.payload) {
    try {
      payload = JSON.parse(options.payload) as Record<string, unknown>;
    } catch {
      throw new Error("--payload must be valid JSON");
    }
  }

  const projectId = requireProject(cfg, options.project);
  const job = await AutomationService.createScheduledJob({
    projectId,
    requestBody: {
      name,
      schedule: options.schedule,
      url: options.url,
      secret: options.secret || undefined,
      payload,
      enabled: !options.disabled,
    },
  });
  if (isJson(options)) {
    printJson(job);
    return;
  }
  success(`created ${job.name} (${job.id})`);
  if (job.secret) {
    process.stderr.write(`signing secret (shown once): ${job.secret}\n`);
  }
}

export async function cmdJobsRemove(jobId: string, options: JobOptions & { yes?: boolean }): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const projectId = requireProject(cfg, options.project);
  await AutomationService.deleteScheduledJob({ projectId, jobId });
  if (isJson(options)) {
    printJson({ deleted: jobId });
  } else {
    success(`deleted ${jobId}`);
  }
}

export async function cmdJobsRun(jobId: string, options: JobOptions): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const projectId = requireProject(cfg, options.project);
  const run = await AutomationService.runScheduledJob({ projectId, jobId });
  if (isJson(options)) {
    printJson(run);
  } else {
    success(`run queued (${run.id}) — status ${run.status}`);
  }
}

function runRow(run: ScheduledJobRun): string[] {
  return [
    formatDate(run.started_at),
    run.status,
    run.triggered_by,
    run.status_code != null ? String(run.status_code) : "—",
    run.duration_ms != null ? `${run.duration_ms}ms` : "—",
    run.error || "—",
  ];
}

export async function cmdJobsRuns(
  jobId: string,
  options: JobOptions & { limit?: string },
): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const projectId = requireProject(cfg, options.project);
  const page = await AutomationService.listScheduledJobRuns({
    projectId,
    jobId,
    limit: options.limit ? Number(options.limit) : 50,
  });
  if (isJson(options)) {
    printJson(page);
  } else {
    printTable(["STARTED", "STATUS", "TRIGGER", "HTTP", "DURATION", "ERROR"], page.items.map(runRow));
  }
}
