/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ReadinessStatus = {
    properties: {
        status: {
            type: 'string',
            isRequired: true,
        },
        checks: {
            type: 'dictionary',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
    },
} as const;
