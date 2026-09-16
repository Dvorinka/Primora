/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $TelemetryEventListResponse = {
    properties: {
        items: {
            type: 'array',
            contains: {
                type: 'TelemetryEvent',
            },
            isRequired: true,
        },
    },
} as const;
