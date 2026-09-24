/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ProjectSecretListResponse = {
    properties: {
        items: {
            type: 'array',
            contains: {
                type: 'ProjectSecret',
            },
            isRequired: true,
        },
    },
} as const;
