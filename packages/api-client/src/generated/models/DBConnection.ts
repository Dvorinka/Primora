/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DBConnection = {
    id: string;
    project_id: string;
    name: string;
    db_type: string;
    host: string;
    port?: number | null;
    database?: string;
    username?: string;
    ssl?: boolean | null;
    is_managed: boolean;
    has_password: boolean;
};

