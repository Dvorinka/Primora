/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ProjectSecret = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        name: {
            type: 'string',
            description: `Env-var-safe name; referenced as secret://NAME in job payloads.`,
            isRequired: true,
        },
        url: {
            type: 'string',
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
