/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MeResponse = {
    properties: {
        user: {
            type: 'UserSummary',
            isRequired: true,
        },
        organizations: {
            type: 'array',
            contains: {
                type: 'OrganizationSummary',
            },
            isRequired: true,
        },
    },
} as const;
