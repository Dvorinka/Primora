/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type FunctionRun = {
    id: string;
    trigger: FunctionRun.trigger;
    status: FunctionRun.status;
    exit_code?: number | null;
    stdout: string;
    stderr: string;
    duration_ms: number;
    created_at: string;
};
export namespace FunctionRun {
    export enum trigger {
        MANUAL = 'manual',
        SCHEDULE = 'schedule',
        HOOK = 'hook',
    }
    export enum status {
        SUCCESS = 'success',
        ERROR = 'error',
        TIMEOUT = 'timeout',
    }
}

