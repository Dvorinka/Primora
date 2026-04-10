/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $BootstrapResponse = {
    properties: {
        organization_id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        organization_slug: {
            type: 'string',
            isRequired: true,
        },
        organization_name: {
            type: 'string',
            isRequired: true,
        },
        project_id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        project_slug: {
            type: 'string',
            isRequired: true,
        },
        project_name: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;
