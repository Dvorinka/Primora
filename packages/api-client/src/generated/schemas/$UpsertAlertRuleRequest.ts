/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $UpsertAlertRuleRequest = {
    properties: {
        name: {
            type: 'string',
            description: `Env-var-safe name ([A-Za-z_][A-Za-z0-9_]*).`,
            isRequired: true,
        },
        kind: {
            type: 'Enum',
            isRequired: true,
        },
        config: {
            type: 'AlertRuleConfig',
        },
        enabled: {
            type: 'boolean',
        },
    },
} as const;
