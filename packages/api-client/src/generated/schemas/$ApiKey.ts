/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ApiKey = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        project_id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        name: {
            type: 'string',
            isRequired: true,
        },
        prefix: {
            type: 'string',
            isRequired: true,
        },
        scopes: {
            type: 'array',
            contains: {
                type: 'Enum',
            },
        },
        last_used_at: {
            type: 'string',
            isNullable: true,
            format: 'date-time',
        },
        revoked_at: {
            type: 'string',
            isNullable: true,
            format: 'date-time',
        },
    },
} as const;
