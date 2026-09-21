/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $InstanceSetting = {
    properties: {
        key: {
            type: 'string',
            isRequired: true,
        },
        type: {
            type: 'Enum',
            isRequired: true,
        },
        secret: {
            type: 'boolean',
            isRequired: true,
        },
        is_set: {
            type: 'boolean',
            description: `True when an in-app override exists`,
            isRequired: true,
        },
        source: {
            type: 'Enum',
            isRequired: true,
        },
        value: {
            description: `Effective value — never returned for secret keys`,
            properties: {
            },
        },
    },
} as const;
