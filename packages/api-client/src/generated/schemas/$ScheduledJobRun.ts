/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ScheduledJobRun = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        job_id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        status: {
            type: 'Enum',
            isRequired: true,
        },
        triggered_by: {
            type: 'Enum',
            isRequired: true,
        },
        status_code: {
            type: 'number',
            isNullable: true,
        },
        error: {
            type: 'string',
        },
        duration_ms: {
            type: 'number',
            isNullable: true,
        },
        started_at: {
            type: 'string',
            format: 'date-time',
        },
        finished_at: {
            type: 'string',
            isNullable: true,
            format: 'date-time',
        },
    },
} as const;
