/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateInboundHookRequest = {
    name: string;
    mode?: CreateInboundHookRequest.mode;
    /**
     * Required when mode=job — scheduled job to trigger.
     */
    job_id?: string;
    /**
     * Optional — stored encrypted; callers must then sign bodies with X-Primora-Signature.
     */
    secret?: string;
    enabled?: boolean;
};
export namespace CreateInboundHookRequest {
    export enum mode {
        EVENT = 'event',
        JOB = 'job',
    }
}

