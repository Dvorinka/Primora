/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ProjectLogin = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        app: {
            type: 'string',
            description: `Stable app id. The current origin is separate and may change.`,
            isRequired: true,
        },
        username: {
            type: 'string',
            isRequired: true,
        },
        origin: {
            type: 'string',
            description: `Current URL of the app, if known. Not the identity.`,
            isRequired: true,
        },
        notes: {
            type: 'string',
            isRequired: true,
        },
        created_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        updated_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
    },
} as const;
