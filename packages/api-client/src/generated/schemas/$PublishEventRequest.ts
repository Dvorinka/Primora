/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $PublishEventRequest = {
    properties: {
        type: {
            type: 'string',
            description: `Event type in the custom.* namespace — realtime subscribers, matching webhooks, and event_pattern functions all fire.`,
            isRequired: true,
            pattern: '^custom\\.[a-z0-9][a-z0-9_.-]{0,62}$',
        },
        data: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
        },
    },
} as const;
