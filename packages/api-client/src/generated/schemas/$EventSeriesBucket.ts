/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EventSeriesBucket = {
    properties: {
        ts: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        counts: {
            type: 'dictionary',
            contains: {
                type: 'number',
            },
            isRequired: true,
        },
    },
} as const;
