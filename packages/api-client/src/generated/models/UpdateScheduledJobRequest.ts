/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateScheduledJobRequest = {
    name?: string;
    schedule?: string;
    url?: string;
    /**
     * Replace the signing secret. Omit to keep the current one.
     */
    secret?: string;
    payload?: Record<string, any>;
    enabled?: boolean;
};

