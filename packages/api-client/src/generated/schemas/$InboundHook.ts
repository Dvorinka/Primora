/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $InboundHook = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        project_id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        name: {
            type: 'string',
            isRequired: true,
        },
        token: {
            type: 'string',
            isRequired: true,
        },
        url: {
            type: 'string',
            description: `Full ingest URL — POST here from the external system.`,
            isRequired: true,
        },
        mode: {
            type: 'Enum',
            isRequired: true,
        },
        job_id: {
            type: 'string',
        },
        function_id: {
            type: 'string',
        },
        has_secret: {
            type: 'boolean',
            isRequired: true,
        },
        enabled: {
            type: 'boolean',
            isRequired: true,
        },
        last_received_at: {
            type: 'string',
            isNullable: true,
            format: 'date-time',
        },
        created_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
    },
} as const;
