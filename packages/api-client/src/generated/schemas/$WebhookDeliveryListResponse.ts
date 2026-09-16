/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $WebhookDeliveryListResponse = {
    properties: {
        items: {
            type: 'array',
            contains: {
                type: 'WebhookDelivery',
            },
            isRequired: true,
        },
    },
} as const;
