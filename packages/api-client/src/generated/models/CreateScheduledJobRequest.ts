/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateScheduledJobRequest = {
    name: string;
    /**
     * Cron expression, e.g. "*15 * * * *", or descriptor like "@every 1h".
     */
    schedule: string;
    /**
     * Delivery target. Required unless function_id is set.
     */
    url?: string;
    /**
     * Invoke this function on schedule instead of POSTing url.
     */
    function_id?: string;
    /**
     * HMAC key for X-Primora-Signature. Generated when omitted.
     */
    secret?: string;
    /**
     * Static JSON payload delivered as data on every run.
     */
    payload?: Record<string, any>;
    enabled?: boolean;
};

