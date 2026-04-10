/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $OrganizationSummary = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        name: {
            type: 'string',
            isRequired: true,
        },
        slug: {
            type: 'string',
            isRequired: true,
        },
        membershipRole: {
            type: 'string',
            isRequired: true,
        },
        projects: {
            type: 'array',
            contains: {
                type: 'ProjectSummary',
            },
            isRequired: true,
        },
    },
} as const;
