/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateWebhookRequest = {
    properties: {
        url: {
            type: 'string',
            isRequired: true,
            format: 'uri',
        },
        secret: {
            type: 'string',
            description: `HMAC key for X-Primora-Signature. Generated when omitted.`,
        },
        events: {
            type: 'array',
            contains: {
                type: 'Enum',
            },
        },
        enabled: {
            type: 'boolean',
        },
    },
} as const;
