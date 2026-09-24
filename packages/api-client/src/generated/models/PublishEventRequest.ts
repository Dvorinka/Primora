/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PublishEventRequest = {
    /**
     * Event type in the custom.* namespace — realtime subscribers, matching webhooks, and event_pattern functions all fire.
     */
    type: string;
    /**
     * Arbitrary JSON payload carried to subscribers.
     */
    data?: Record<string, any>;
};

