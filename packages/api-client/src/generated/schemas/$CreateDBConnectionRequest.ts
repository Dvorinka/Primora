/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateDBConnectionRequest = {
    properties: {
        name: {
            type: 'string',
            isRequired: true,
        },
        db_type: {
            type: 'Enum',
            isRequired: true,
        },
        host: {
            type: 'string',
            isRequired: true,
        },
        port: {
            type: 'number',
        },
        database: {
            type: 'string',
        },
        username: {
            type: 'string',
        },
        password: {
            type: 'string',
        },
        ssl: {
            type: 'boolean',
        },
        driver_profile: {
            type: 'string',
        },
    },
} as const;
