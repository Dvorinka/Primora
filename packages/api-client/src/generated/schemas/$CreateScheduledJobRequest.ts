/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateScheduledJobRequest = {
    properties: {
        name: {
            type: 'string',
            isRequired: true,
            minLength: 2,
        },
        schedule: {
            type: 'string',
            description: `Cron expression, e.g. "*/15 * * * *", or descriptor like "@every 1h".`,
            isRequired: true,
        },
        url: {
            type: 'string',
            description: `Delivery target. Required unless function_id is set.`,
            format: 'uri',
        },
        function_id: {
            type: 'string',
            description: `Invoke this function on schedule instead of POSTing url.`,
            format: 'uuid',
        },
        secret: {
            type: 'string',
            description: `HMAC key for X-Primora-Signature. Generated when omitted.`,
        },
        payload: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
        },
        enabled: {
            type: 'boolean',
        },
    },
} as const;
