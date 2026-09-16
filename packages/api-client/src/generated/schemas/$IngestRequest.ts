/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $IngestRequest = {
    type: 'one-of',
    contains: [{
        type: 'IngestEvent',
    }, {
        properties: {
            events: {
                type: 'array',
                contains: {
                    type: 'IngestEvent',
                },
                isRequired: true,
            },
        },
    }],
} as const;
