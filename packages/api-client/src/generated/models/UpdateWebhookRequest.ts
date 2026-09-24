/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateWebhookRequest = {
    url?: string;
    /**
     * Replace the signing secret. Omit to keep the current one.
     */
    secret?: string;
    events?: Array<'issue.created' | 'deploy.marker' | 'webhook.test' | 'job.run' | 'alert.fired' | 'alert.resolved' | 'inbound.received' | 'document.created' | 'document.updated' | 'document.deleted' | 'object.created' | 'object.updated' | 'object.deleted'>;
    enabled?: boolean;
};

