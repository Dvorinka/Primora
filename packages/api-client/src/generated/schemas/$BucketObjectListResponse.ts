/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $BucketObjectListResponse = {
    type: 'all-of',
    contains: [{
        type: 'PaginationMetadata',
    }, {
        properties: {
            items: {
                type: 'array',
                contains: {
                    type: 'BucketObject',
                },
                isRequired: true,
            },
        },
    }],
} as const;
