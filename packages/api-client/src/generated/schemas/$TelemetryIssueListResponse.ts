/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $TelemetryIssueListResponse = {
    properties: {
        items: {
            type: 'array',
            contains: {
                type: 'TelemetryIssue',
            },
            isRequired: true,
        },
    },
} as const;
