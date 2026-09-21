/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $InstanceSettingsResponse = {
    properties: {
        settings: {
            type: 'array',
            contains: {
                type: 'InstanceSetting',
            },
            isRequired: true,
        },
    },
} as const;
