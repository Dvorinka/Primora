/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type InboundHook = {
    id: string;
    project_id: string;
    name: string;
    token: string;
    /**
     * Full ingest URL — POST here from the external system.
     */
    url: string;
    mode: InboundHook.mode;
    job_id?: string;
    function_id?: string;
    has_secret: boolean;
    enabled: boolean;
    last_received_at?: string | null;
    created_at: string;
};
export namespace InboundHook {
    export enum mode {
        EVENT = 'event',
        JOB = 'job',
        FUNCTION = 'function',
    }
}

