/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ActorContext = {
    properties: {
        actor: {
            type: 'Enum',
            isRequired: true,
        },
        scopes: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        key_prefix: {
            type: 'string',
        },
        organization: {
            type: 'ContextRef',
        },
        project: {
            type: 'ContextRef',
        },
    },
} as const;
