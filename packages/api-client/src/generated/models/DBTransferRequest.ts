/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DBTransferRequest = {
    target_connection_id: string;
    /**
     * SELECT run against the source connection.
     */
    query: string;
    database?: string;
    /**
     * Destination table for SQL targets (schema-qualified allowed).
     */
    target_table?: string;
    /**
     * Redis targets: SET key template with {column} placeholders, e.g. "user:{id}".
     */
    key_pattern?: string;
    /**
     * Redis targets: column whose cell becomes the value. Omitted stores the whole row as JSON.
     */
    value_column?: string;
    /**
     * Optional EX TTL applied to each Redis SET.
     */
    ttl_seconds?: number;
    limit?: number;
};

