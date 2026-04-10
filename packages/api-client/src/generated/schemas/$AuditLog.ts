/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $AuditLog = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        created_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        action: {
            type: 'string',
            isRequired: true,
        },
        resource_type: {
            type: 'string',
            isRequired: true,
        },
        resource_id: {
            type: 'string',
            isRequired: true,
        },
        request_id: {
            type: 'string',
            isRequired: true,
        },
        metadata: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
            isRequired: true,
        },
    },
} as const;
