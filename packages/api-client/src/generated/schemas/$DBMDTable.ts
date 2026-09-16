/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DBMDTable = {
    properties: {
        columns: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
        rows: {
            type: 'array',
            contains: {
                type: 'array',
                contains: {
                    type: 'string',
                },
            },
            isRequired: true,
        },
        note: {
            type: 'string',
        },
    },
} as const;
