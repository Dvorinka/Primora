/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DBDatabaseListResponse = {
    properties: {
        databases: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
        raw: {
            type: 'string',
        },
    },
} as const;
