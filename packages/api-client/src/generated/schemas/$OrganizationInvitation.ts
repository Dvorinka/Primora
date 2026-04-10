/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $OrganizationInvitation = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        organization_id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        project_id: {
            type: 'string',
            isNullable: true,
            format: 'uuid',
        },
        project_name: {
            type: 'string',
            isNullable: true,
        },
        email: {
            type: 'string',
            isRequired: true,
            format: 'email',
        },
        org_role: {
            type: 'Enum',
            isRequired: true,
        },
        project_role: {
            type: 'Enum',
            isNullable: true,
        },
        expires_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        accepted_at: {
            type: 'string',
            isNullable: true,
            format: 'date-time',
        },
        invited_by_user_id: {
            type: 'string',
            isNullable: true,
            format: 'uuid',
        },
        created_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        status: {
            type: 'Enum',
            isRequired: true,
        },
    },
} as const;
