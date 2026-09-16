/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $WebhookCreateResponse = {
    type: 'all-of',
    contains: [{
        type: 'Webhook',
    }, {
        properties: {
            secret: {
                type: 'string',
                description: `Plaintext secret — present only when Primora generated it. Store it; it cannot be recovered.`,
            },
        },
    }],
} as const;
