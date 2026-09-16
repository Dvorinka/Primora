/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MetricPoint = {
    properties: {
        ts: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        avg: {
            type: 'number',
            isNullable: true,
        },
        p50: {
            type: 'number',
            isNullable: true,
        },
        p95: {
            type: 'number',
            isNullable: true,
        },
        max: {
            type: 'number',
            isNullable: true,
        },
        count: {
            type: 'number',
            isRequired: true,
        },
    },
} as const;
