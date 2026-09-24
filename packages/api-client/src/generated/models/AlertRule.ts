/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AlertRuleConfig } from './AlertRuleConfig';
export type AlertRule = {
    id: string;
    project_id: string;
    name: string;
    kind: AlertRule.kind;
    config: AlertRuleConfig;
    enabled: boolean;
    /**
     * Component names currently in breached state.
     */
    firing: Array<string>;
    created_at: string;
    updated_at: string;
};
export namespace AlertRule {
    export enum kind {
        HEARTBEAT_SILENCE = 'heartbeat_silence',
        ERROR_SPIKE = 'error_spike',
    }
}

