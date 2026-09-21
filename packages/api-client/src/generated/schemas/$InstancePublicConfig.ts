/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $InstancePublicConfig = {
    properties: {
        signup_enabled: {
            type: 'boolean',
            description: `Whether public sign-up is open (bootstrap always allowed)`,
            isRequired: true,
        },
        bootstrap_required: {
            type: 'boolean',
            description: `True when no user exists yet — first sign-up becomes instance admin`,
            isRequired: true,
        },
        social_providers: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
    },
} as const;
