/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $UpdateWebhookRequest = {
    properties: {
        url: {
            type: 'string',
            format: 'uri',
        },
        secret: {
            type: 'string',
            description: `Replace the signing secret. Omit to keep the current one.`,
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
