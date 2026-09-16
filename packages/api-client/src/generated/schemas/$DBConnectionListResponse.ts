/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DBConnectionListResponse = {
    properties: {
        items: {
            type: 'array',
            contains: {
                type: 'DBConnection',
            },
            isRequired: true,
        },
    },
} as const;
