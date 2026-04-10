/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $OrganizationMember = {
    properties: {
        user_id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        email: {
            type: 'string',
            isRequired: true,
        },
        name: {
            type: 'string',
            isRequired: true,
        },
        email_verified: {
            type: 'boolean',
            isRequired: true,
        },
        role: {
            type: 'Enum',
            isRequired: true,
        },
        joined_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
    },
} as const;
