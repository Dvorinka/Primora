/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type IngestEvent = {
    type: IngestEvent.type;
    /**
     * Auto-registered under the project on first use
     */
    component?: string;
    kind?: IngestEvent.kind;
    severity?: string;
    message?: string;
    payload?: Record<string, any>;
    /**
     * Error grouping key; derived from message when omitted
     */
    fingerprint?: string;
    ts?: string;
};
export namespace IngestEvent {
    export enum type {
        ERROR = 'error',
        METRIC = 'metric',
        LOG = 'log',
        HEARTBEAT = 'heartbeat',
        EVENT = 'event',
    }
    export enum kind {
        FRONTEND = 'frontend',
        BACKEND = 'backend',
        DATABASE = 'database',
        ANDROID = 'android',
        DESKTOP = 'desktop',
        WEB = 'web',
        OTHER = 'other',
    }
}

