/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $UpdateScheduledJobRequest = {
    properties: {
        name: {
            type: 'string',
            minLength: 2,
        },
        schedule: {
            type: 'string',
        },
        url: {
            type: 'string',
            format: 'uri',
        },
        secret: {
            type: 'string',
            description: `Replace the signing secret. Omit to keep the current one.`,
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
