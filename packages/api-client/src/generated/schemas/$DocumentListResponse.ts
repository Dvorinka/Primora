/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DocumentListResponse = {
    type: 'all-of',
    contains: [{
        type: 'PaginationMetadata',
    }, {
        properties: {
            items: {
                type: 'array',
                contains: {
                    type: 'Document',
                },
                isRequired: true,
            },
        },
    }],
} as const;
