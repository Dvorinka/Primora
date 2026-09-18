/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ScheduledJob } from './ScheduledJob';
export type ScheduledJobCreateResponse = (ScheduledJob & {
    /**
     * Plaintext secret — present only when Primora generated it. Store it; it cannot be recovered.
     */
    secret?: string;
});

