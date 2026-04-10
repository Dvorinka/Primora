/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $UpdateBucketObjectRequest = {
    properties: {
        newObjectKey: {
            type: 'string',
            isRequired: true,
        },
        destinationBucketId: {
            type: 'string',
            isNullable: true,
            format: 'uuid',
        },
    },
} as const;
