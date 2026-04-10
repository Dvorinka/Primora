/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $BootstrapRequest = {
    properties: {
        organizationName: {
            type: 'string',
            isRequired: true,
        },
        organizationSlug: {
            type: 'string',
            isRequired: true,
        },
        projectName: {
            type: 'string',
            isRequired: true,
        },
        projectSlug: {
            type: 'string',
            isRequired: true,
        },
        description: {
            type: 'string',
            isNullable: true,
        },
    },
} as const;
