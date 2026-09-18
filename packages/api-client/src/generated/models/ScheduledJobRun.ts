/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ScheduledJobRun = {
    id: string;
    job_id: string;
    status: ScheduledJobRun.status;
    triggered_by: ScheduledJobRun.triggered_by;
    status_code?: number | null;
    error?: string;
    duration_ms?: number | null;
    started_at?: string;
    finished_at?: string | null;
};
export namespace ScheduledJobRun {
    export enum status {
        RUNNING = 'running',
        SUCCESS = 'success',
        FAILED = 'failed',
    }
    export enum triggered_by {
        SCHEDULE = 'schedule',
        MANUAL = 'manual',
    }
}

