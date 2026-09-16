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
    events?: Array<'issue.created' | 'deploy.marker' | 'webhook.test'>;
    enabled?: boolean;
};

