/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $TelemetryEvent = {
    properties: {
        id: {
            type: 'number',
            isRequired: true,
        },
        project_id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        component_id: {
            type: 'string',
            isNullable: true,
            format: 'uuid',
        },
        component_name: {
            type: 'string',
        },
        type: {
            type: 'string',
            isRequired: true,
        },
        severity: {
            type: 'string',
            isRequired: true,
        },
        message: {
            type: 'string',
            isRequired: true,
        },
        payload: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
        },
        fingerprint: {
            type: 'string',
        },
        ts: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
    },
} as const;
