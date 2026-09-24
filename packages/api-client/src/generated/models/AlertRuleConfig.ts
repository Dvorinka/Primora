/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AlertRuleConfig = {
    /**
     * Restrict the rule to one component name; empty = all components.
     */
    component?: string;
    /**
     * heartbeat_silence — fire when a component has not heartbeated for this many minutes (1–10080).
     */
    threshold_minutes?: number;
    /**
     * error_spike — fire when a component logs at least this many errors inside the window.
     */
    threshold_count?: number;
    /**
     * error_spike — sliding window size (default 15, 1–1440).
     */
    window_minutes?: number;
};

