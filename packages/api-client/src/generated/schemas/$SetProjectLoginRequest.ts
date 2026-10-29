/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $SetProjectLoginRequest = {
    properties: {
        username: {
            type: 'string',
            isRequired: true,
        },
        password: {
            type: 'string',
            description: `Plaintext — stored AES-256-GCM encrypted, never returned by list.`,
            isRequired: true,
        },
        origin: {
            type: 'string',
        },
        notes: {
            type: 'string',
        },
    },
} as const;
