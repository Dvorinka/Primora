/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type WebhookDelivery = {
    id: string;
    webhook_id: string;
    event_type: string;
    payload?: Record<string, any>;
    status: WebhookDelivery.status;
    attempts: number;
    last_status_code?: number | null;
    last_error?: string;
    delivered_at?: string | null;
    next_retry_at?: string | null;
    created_at?: string;
};
export namespace WebhookDelivery {
    export enum status {
        PENDING = 'pending',
        DELIVERED = 'delivered',
        FAILED = 'failed',
    }
}

