/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProjectLogin = {
    id: string;
    /**
     * Stable app id. The current origin is separate and may change.
     */
    app: string;
    username: string;
    /**
     * Current URL of the app, if known. Not the identity.
     */
    origin: string;
    notes: string;
    created_at: string;
    updated_at: string;
};

