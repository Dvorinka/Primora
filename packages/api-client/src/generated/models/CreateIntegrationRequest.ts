/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateIntegrationRequest = {
    name: string;
    type: CreateIntegrationRequest.type;
    /**
     * Root URL of the self-hosted instance, e.g. https://analytics.example.com
     */
    base_url: string;
    /**
     * Credential stored encrypted at rest; never returned by any endpoint.
     */
    api_key?: string;
    site_id?: string;
};
export namespace CreateIntegrationRequest {
    export enum type {
        RYBBIT = 'rybbit',
    }
}

