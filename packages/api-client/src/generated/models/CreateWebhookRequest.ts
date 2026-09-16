/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateWebhookRequest = {
    url: string;
    /**
     * HMAC key for X-Primora-Signature. Generated when omitted.
     */
    secret?: string;
    events?: Array<'issue.created' | 'deploy.marker' | 'webhook.test'>;
    enabled?: boolean;
};

