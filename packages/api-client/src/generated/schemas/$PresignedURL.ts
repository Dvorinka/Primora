/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $PresignedURL = {
    properties: {
        url: {
            type: 'string',
            description: `Fully-signed URL — call it with the returned method, no auth header needed.`,
            isRequired: true,
        },
        method: {
            type: 'Enum',
            isRequired: true,
        },
        expires_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
    },
} as const;
