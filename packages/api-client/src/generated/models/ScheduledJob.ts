/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ScheduledJob = {
    id: string;
    project_id: string;
    name: string;
    /**
     * Cron expression (5-field) or descriptor (@hourly, @every 30m).
     */
    schedule: string;
    url: string;
    /**
     * Static JSON payload merged into every delivery's data field.
     */
    payload: Record<string, any>;
    enabled: boolean;
    has_secret: boolean;
    last_run_at?: string | null;
    last_status?: ScheduledJob.last_status | null;
    next_run_at?: string | null;
    created_at?: string;
};
export namespace ScheduledJob {
    export enum last_status {
        SUCCESS = 'success',
        FAILED = 'failed',
    }
}

