/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProjectOverview = {
    project_id: string;
    organization_id: string;
    project_slug: string;
    project_name: string;
    member_count: number;
    active_api_key_count: number;
    bucket_count: number;
    object_count: number;
    object_bytes_total: number;
    pending_invitation_count: number;
    audit_events_24h: number;
    last_audit_at?: string | null;
    /**
     * Connectors attached to the project.
     */
    integration_count: number;
    /**
     * Enabled outbound webhooks.
     */
    webhook_count: number;
};

