/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Project = {
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
        slug: {
            type: 'string',
            isRequired: true,
        },
        name: {
            type: 'string',
            isRequired: true,
        },
        description: {
            type: 'string',
            isNullable: true,
        },
        membership_role: {
            type: 'string',
            isNullable: true,
        },
        retention_events_days: {
            type: 'number',
        },
        retention_audit_days: {
            type: 'number',
        },
        retention_webhook_days: {
            type: 'number',
        },
    },
} as const;
