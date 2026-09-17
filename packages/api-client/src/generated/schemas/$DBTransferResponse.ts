/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DBTransferResponse = {
    properties: {
        transferred: {
            type: 'number',
            isRequired: true,
        },
        truncated: {
            type: 'boolean',
            isRequired: true,
        },
        source: {
            type: 'string',
            isRequired: true,
        },
        target: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;
