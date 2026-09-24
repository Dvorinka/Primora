/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $PresignObjectRequest = {
    properties: {
        key: {
            type: 'string',
            description: `Object key inside the bucket.`,
            isRequired: true,
        },
        op: {
            type: 'Enum',
        },
        ttl_seconds: {
            type: 'number',
            maximum: 3600,
            minimum: 60,
        },
    },
} as const;
