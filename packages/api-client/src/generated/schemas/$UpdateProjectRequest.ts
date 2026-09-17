/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $UpdateProjectRequest = {
    properties: {
        name: {
            type: 'string',
            isRequired: true,
        },
        slug: {
            type: 'string',
            isRequired: true,
        },
        description: {
            type: 'string',
            isNullable: true,
        },
        retention_events_days: {
            type: 'number',
            description: `Telemetry event retention; 0 disables the sweep.`,
            maximum: 3650,
        },
        retention_audit_days: {
            type: 'number',
            description: `Audit log retention; 0 disables the sweep.`,
            maximum: 3650,
        },
        retention_webhook_days: {
            type: 'number',
            description: `Webhook delivery retention; 0 disables the sweep.`,
            maximum: 3650,
        },
    },
} as const;
