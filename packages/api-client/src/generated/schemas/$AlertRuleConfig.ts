/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $AlertRuleConfig = {
    properties: {
        component: {
            type: 'string',
            description: `Restrict the rule to one component name; empty = all components.`,
        },
        threshold_minutes: {
            type: 'number',
            description: `heartbeat_silence — fire when a component has not heartbeated for this many minutes (1–10080).`,
        },
        threshold_count: {
            type: 'number',
            description: `error_spike — fire when a component logs at least this many errors inside the window.`,
            format: 'int64',
        },
        window_minutes: {
            type: 'number',
            description: `error_spike — sliding window size (default 15, 1–1440).`,
        },
    },
} as const;
