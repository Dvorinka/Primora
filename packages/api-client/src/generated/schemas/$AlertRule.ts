/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $AlertRule = {
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
        kind: {
            type: 'Enum',
            isRequired: true,
        },
        config: {
            type: 'AlertRuleConfig',
            isRequired: true,
        },
        enabled: {
            type: 'boolean',
            isRequired: true,
        },
        firing: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
        created_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        updated_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
    },
} as const;
