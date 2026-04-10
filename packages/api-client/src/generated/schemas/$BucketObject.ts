/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $BucketObject = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        bucket_id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        object_key: {
            type: 'string',
            isRequired: true,
        },
        content_type: {
            type: 'string',
            isRequired: true,
        },
        size_bytes: {
            type: 'number',
            isRequired: true,
            format: 'int64',
        },
        checksum_sha256: {
            type: 'string',
            isRequired: true,
        },
        created_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
    },
} as const;
