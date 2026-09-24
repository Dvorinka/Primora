/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ScheduledJob = {
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
        schedule: {
            type: 'string',
            description: `Cron expression (5-field) or descriptor (@hourly, @every 30m).`,
            isRequired: true,
        },
        url: {
            type: 'string',
            isRequired: true,
        },
        function_id: {
            type: 'string',
            description: `When set, the schedule invokes this function instead of POSTing url.`,
            isNullable: true,
            format: 'uuid',
        },
        payload: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
            isRequired: true,
        },
        enabled: {
            type: 'boolean',
            isRequired: true,
        },
        has_secret: {
            type: 'boolean',
            isRequired: true,
        },
        last_run_at: {
            type: 'string',
            isNullable: true,
            format: 'date-time',
        },
        last_status: {
            type: 'Enum',
            isNullable: true,
        },
        next_run_at: {
            type: 'string',
            isNullable: true,
            format: 'date-time',
        },
        created_at: {
            type: 'string',
            format: 'date-time',
        },
    },
} as const;
