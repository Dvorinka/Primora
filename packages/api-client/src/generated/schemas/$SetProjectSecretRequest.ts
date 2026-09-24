/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $SetProjectSecretRequest = {
    properties: {
        value: {
            type: 'string',
            description: `Plaintext — stored AES-256-GCM encrypted, never returned by list.`,
            isRequired: true,
        },
        url: {
            type: 'string',
        },
        notes: {
            type: 'string',
        },
    },
} as const;
