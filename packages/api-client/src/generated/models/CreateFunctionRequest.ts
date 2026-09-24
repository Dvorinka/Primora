/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateFunctionRequest = {
    name: string;
    code: string;
    runtime?: CreateFunctionRequest.runtime;
    /**
     * Optional — "document.*", "*", or an exact event type.
     */
    event_pattern?: string;
};
export namespace CreateFunctionRequest {
    export enum runtime {
        BUN = 'bun',
        DENO = 'deno',
    }
}

