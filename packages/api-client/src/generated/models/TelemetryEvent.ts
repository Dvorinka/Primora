/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TelemetryEvent = {
    id: number;
    project_id: string;
    component_id?: string | null;
    component_name?: string;
    type: string;
    severity: string;
    message: string;
    payload?: Record<string, any>;
    fingerprint?: string;
    ts: string;
};

