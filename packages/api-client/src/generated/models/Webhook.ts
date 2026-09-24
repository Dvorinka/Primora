/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Webhook = {
    id: string;
    project_id: string;
    url: string;
    /**
     * Event filter (issue.created, deploy.marker, webhook.test, job.run, alert.fired, alert.resolved, inbound.received, document.*, object.*). Empty means all events.
     */
    events: Array<string>;
    enabled: boolean;
    has_secret: boolean;
    created_at?: string;
};

