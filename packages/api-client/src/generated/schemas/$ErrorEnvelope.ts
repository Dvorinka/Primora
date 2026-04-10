/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ErrorEnvelope = {
    properties: {
        status: {
            type: 'string',
            isRequired: true,
        },
        error: {
            properties: {
                code: {
                    type: 'string',
                    isRequired: true,
                },
                message: {
                    type: 'string',
                    isRequired: true,
                },
            },
            isRequired: true,
        },
    },
} as const;
