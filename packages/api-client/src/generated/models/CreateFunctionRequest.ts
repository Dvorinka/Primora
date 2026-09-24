/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateFunctionRequest = {
    name: string;
    code: string;
    runtime?: CreateFunctionRequest.runtime;
};
export namespace CreateFunctionRequest {
    export enum runtime {
        BUN = 'bun',
        DENO = 'deno',
    }
}

