/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateDBConnectionRequest = {
    name: string;
    db_type: CreateDBConnectionRequest.db_type;
    host: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    ssl?: boolean;
    driver_profile?: string;
};
export namespace CreateDBConnectionRequest {
    export enum db_type {
        POSTGRES = 'postgres',
        MYSQL = 'mysql',
        SQLITE = 'sqlite',
        REDIS = 'redis',
        MONGODB = 'mongodb',
        SQLSERVER = 'sqlserver',
        DUCKDB = 'duckdb',
        CLICKHOUSE = 'clickhouse',
        CASSANDRA = 'cassandra',
    }
}

