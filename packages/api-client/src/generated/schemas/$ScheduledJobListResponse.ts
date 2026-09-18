/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ScheduledJobListResponse = {
    properties: {
        items: {
            type: 'array',
            contains: {
                type: 'ScheduledJob',
            },
            isRequired: true,
        },
    },
} as const;
