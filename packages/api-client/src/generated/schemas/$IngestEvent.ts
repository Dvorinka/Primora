/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $IngestEvent = {
    properties: {
        type: {
            type: 'Enum',
            isRequired: true,
        },
        component: {
            type: 'string',
            description: `Auto-registered under the project on first use`,
        },
        kind: {
            type: 'Enum',
        },
        severity: {
            type: 'string',
        },
        message: {
            type: 'string',
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
            description: `Error grouping key; derived from message when omitted`,
        },
        ts: {
            type: 'string',
            format: 'date-time',
        },
    },
} as const;
