/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ProjectOverview = {
    properties: {
        project_id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        organization_id: {
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
        member_count: {
            type: 'number',
            isRequired: true,
            format: 'int64',
        },
        active_api_key_count: {
            type: 'number',
            isRequired: true,
            format: 'int64',
        },
        bucket_count: {
            type: 'number',
            isRequired: true,
            format: 'int64',
        },
        object_count: {
            type: 'number',
            isRequired: true,
            format: 'int64',
        },
        object_bytes_total: {
            type: 'number',
            isRequired: true,
            format: 'int64',
        },
        pending_invitation_count: {
            type: 'number',
            isRequired: true,
            format: 'int64',
        },
        audit_events_24h: {
            type: 'number',
            isRequired: true,
            format: 'int64',
        },
        last_audit_at: {
            type: 'string',
            isNullable: true,
            format: 'date-time',
        },
    },
} as const;
