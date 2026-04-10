/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $PaginationMetadata = {
    properties: {
        total: {
            type: 'number',
            isRequired: true,
            format: 'int64',
        },
        limit: {
            type: 'number',
            isRequired: true,
            format: 'int32',
        },
        offset: {
            type: 'number',
            isRequired: true,
            format: 'int32',
        },
        has_more: {
            type: 'boolean',
            isRequired: true,
        },
    },
} as const;
