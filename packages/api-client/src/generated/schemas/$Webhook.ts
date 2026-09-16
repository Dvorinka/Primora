/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Webhook = {
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
        url: {
            type: 'string',
            isRequired: true,
        },
        events: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
        enabled: {
            type: 'boolean',
            isRequired: true,
        },
        has_secret: {
            type: 'boolean',
            isRequired: true,
        },
        created_at: {
            type: 'string',
            format: 'date-time',
        },
    },
} as const;
