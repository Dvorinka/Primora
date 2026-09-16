/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DBConnection = {
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
        db_type: {
            type: 'string',
            isRequired: true,
        },
        host: {
            type: 'string',
            isRequired: true,
        },
        port: {
            type: 'number',
            isNullable: true,
        },
        database: {
            type: 'string',
        },
        username: {
            type: 'string',
        },
        ssl: {
            type: 'boolean',
            isNullable: true,
        },
        is_managed: {
            type: 'boolean',
            isRequired: true,
        },
        has_password: {
            type: 'boolean',
            isRequired: true,
        },
    },
} as const;
