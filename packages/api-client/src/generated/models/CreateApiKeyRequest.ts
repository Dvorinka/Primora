/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateApiKeyRequest = {
    name: string;
    /**
     * Access scopes for the key. admin unlocks everything; write unlocks read + ingest + non-admin mutations; read and ingest unlock only themselves. Omitted means ["admin"] (full access, legacy behaviour).
     */
    scopes?: Array<'ingest' | 'read' | 'write' | 'admin'>;
};

