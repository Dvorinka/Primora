/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AlertRuleConfig } from './AlertRuleConfig';
export type UpsertAlertRuleRequest = {
    /**
     * Env-var-safe name ([A-Za-z_][A-Za-z0-9_]*).
     */
    name: string;
    kind: UpsertAlertRuleRequest.kind;
    config?: AlertRuleConfig;
    enabled?: boolean;
};
export namespace UpsertAlertRuleRequest {
    export enum kind {
        HEARTBEAT_SILENCE = 'heartbeat_silence',
        ERROR_SPIKE = 'error_spike',
    }
}

