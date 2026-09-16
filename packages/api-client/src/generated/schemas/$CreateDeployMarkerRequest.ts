/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateDeployMarkerRequest = {
    properties: {
        version: {
            type: 'string',
        },
        ref: {
            type: 'string',
            description: `Git SHA, tag or branch being deployed.`,
        },
        environment: {
            type: 'string',
        },
        note: {
            type: 'string',
        },
    },
} as const;
