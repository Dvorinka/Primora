/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ApiKey = {
    id: string;
    project_id: string;
    name: string;
    prefix: string;
    scopes?: Array<'ingest' | 'read' | 'write' | 'admin'>;
    last_used_at?: string | null;
    revoked_at?: string | null;
};

