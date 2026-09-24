/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Function = {
    id: string;
    name: string;
    runtime: Function.runtime;
    enabled: boolean;
    created_at: string;
    updated_at: string;
};
export namespace Function {
    export enum runtime {
        BUN = 'bun',
        DENO = 'deno',
    }
}

