/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $TelemetryStats = {
    properties: {
        window: {
            type: 'number',
            isRequired: true,
        },
        bucket_sec: {
            type: 'number',
            isRequired: true,
        },
        series: {
            type: 'array',
            contains: {
                type: 'EventSeriesBucket',
            },
            isRequired: true,
        },
        components: {
            type: 'array',
            contains: {
                type: 'ComponentHealth',
            },
            isRequired: true,
        },
        errors: {
            type: 'number',
            isRequired: true,
        },
        events: {
            type: 'number',
            isRequired: true,
        },
        metrics: {
            type: 'number',
            isRequired: true,
        },
        metric_names: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
    },
} as const;
