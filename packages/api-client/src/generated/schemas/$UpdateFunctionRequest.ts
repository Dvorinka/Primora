/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $UpdateFunctionRequest = {
    properties: {
        code: {
            type: 'string',
        },
        enabled: {
            type: 'boolean',
        },
        event_pattern: {
            type: 'string',
            description: `Replace the trigger pattern; "" disables event triggers.`,
        },
    },
} as const;
