/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ComponentHealth = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        name: {
            type: 'string',
            isRequired: true,
        },
        kind: {
            type: 'string',
            isRequired: true,
        },
        last_seen_at: {
            type: 'string',
            isNullable: true,
            format: 'date-time',
        },
        last_status: {
            type: 'string',
        },
        errors_24h: {
            type: 'number',
            isRequired: true,
        },
        events_24h: {
            type: 'number',
            isRequired: true,
        },
        meta: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
        },
    },
} as const;
