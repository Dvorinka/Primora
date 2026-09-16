/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $WebhookListResponse = {
    properties: {
        items: {
            type: 'array',
            contains: {
                type: 'Webhook',
            },
            isRequired: true,
        },
    },
} as const;
