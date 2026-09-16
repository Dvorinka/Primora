/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $TelemetryIssue = {
    properties: {
        fingerprint: {
            type: 'string',
            isRequired: true,
        },
        message: {
            type: 'string',
            isRequired: true,
        },
        component_id: {
            type: 'string',
            isNullable: true,
            format: 'uuid',
        },
        component_name: {
            type: 'string',
        },
        count: {
            type: 'number',
            isRequired: true,
        },
        first_seen: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        last_seen: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        severity: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;
