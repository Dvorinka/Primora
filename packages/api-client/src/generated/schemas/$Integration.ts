/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Integration = {
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
        type: {
            type: 'Enum',
            isRequired: true,
        },
        name: {
            type: 'string',
            isRequired: true,
        },
        base_url: {
            type: 'string',
            isRequired: true,
        },
        site_id: {
            type: 'string',
            description: `Connector-specific target (Rybbit site id). Optional.`,
        },
        status: {
            type: 'Enum',
            isRequired: true,
        },
        last_health_at: {
            type: 'string',
            isNullable: true,
            format: 'date-time',
        },
        has_credentials: {
            type: 'boolean',
            isRequired: true,
        },
        created_at: {
            type: 'string',
            format: 'date-time',
        },
    },
} as const;
