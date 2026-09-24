/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Function = {
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
        runtime: {
            type: 'Enum',
            isRequired: true,
        },
        enabled: {
            type: 'boolean',
            isRequired: true,
        },
        event_pattern: {
            type: 'string',
            description: `Domain-event pattern that triggers this function — "document.*", "*", exact type. Empty = never.`,
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
