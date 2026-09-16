/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MetricSeriesResponse = {
    properties: {
        items: {
            type: 'array',
            contains: {
                type: 'MetricPoint',
            },
            isRequired: true,
        },
    },
} as const;
