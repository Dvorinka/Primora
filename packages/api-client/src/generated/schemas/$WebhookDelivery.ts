/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $WebhookDelivery = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        webhook_id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        event_type: {
            type: 'string',
            isRequired: true,
        },
        payload: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
        },
        status: {
            type: 'Enum',
            isRequired: true,
        },
        attempts: {
            type: 'number',
            isRequired: true,
        },
        last_status_code: {
            type: 'number',
            isNullable: true,
        },
        last_error: {
            type: 'string',
        },
        delivered_at: {
            type: 'string',
            isNullable: true,
            format: 'date-time',
        },
        next_retry_at: {
            type: 'string',
            isNullable: true,
            format: 'date-time',
        },
        created_at: {
            type: 'string',
            format: 'date-time',
        },
    },
} as const;
