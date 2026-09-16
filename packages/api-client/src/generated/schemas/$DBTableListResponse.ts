/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DBTableListResponse = {
    properties: {
        tables: {
            type: 'array',
            contains: {
                type: 'DBObject',
            },
        },
        table: {
            type: 'DBMDTable',
        },
        raw: {
            type: 'string',
        },
    },
} as const;
