/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateProjectRequest = {
    name: string;
    slug: string;
    description?: string | null;
    /**
     * Telemetry event retention; 0 disables the sweep.
     */
    retention_events_days?: number;
    /**
     * Audit log retention; 0 disables the sweep.
     */
    retention_audit_days?: number;
    /**
     * Webhook delivery retention; 0 disables the sweep.
     */
    retention_webhook_days?: number;
};

