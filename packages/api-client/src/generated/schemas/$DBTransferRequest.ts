/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DBTransferRequest = {
    properties: {
        target_connection_id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        query: {
            type: 'string',
            description: `SELECT run against the source connection.`,
            isRequired: true,
        },
        database: {
            type: 'string',
        },
        target_table: {
            type: 'string',
            description: `Destination table for SQL targets (schema-qualified allowed).`,
        },
        key_pattern: {
            type: 'string',
            description: `Redis targets: SET key template with {column} placeholders, e.g. "user:{id}".`,
        },
        value_column: {
            type: 'string',
            description: `Redis targets: column whose cell becomes the value. Omitted stores the whole row as JSON.`,
        },
        ttl_seconds: {
            type: 'number',
            description: `Optional EX TTL applied to each Redis SET.`,
        },
        limit: {
            type: 'number',
            maximum: 1000,
            minimum: 1,
        },
    },
} as const;
