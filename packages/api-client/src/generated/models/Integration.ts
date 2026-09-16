/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Integration = {
    id: string;
    project_id: string;
    type: Integration.type;
    name: string;
    base_url: string;
    /**
     * Connector-specific target (Rybbit site id). Optional.
     */
    site_id?: string;
    status: Integration.status;
    last_health_at?: string | null;
    has_credentials: boolean;
    created_at?: string;
};
export namespace Integration {
    export enum type {
        RYBBIT = 'rybbit',
    }
    export enum status {
        UNKNOWN = 'unknown',
        OK = 'ok',
        ERROR = 'error',
    }
}

