/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateFunctionRequest = {
    properties: {
        name: {
            type: 'string',
            isRequired: true,
        },
        code: {
            type: 'string',
            isRequired: true,
        },
        runtime: {
            type: 'Enum',
        },
        event_pattern: {
            type: 'string',
            description: `Optional — "document.*", "*", or an exact event type.`,
        },
    },
} as const;
