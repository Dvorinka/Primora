/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type InstancePublicConfig = {
    /**
     * Whether public sign-up is open (bootstrap always allowed)
     */
    signup_enabled: boolean;
    /**
     * True when no user exists yet — first sign-up becomes instance admin
     */
    bootstrap_required: boolean;
    /**
     * Enabled OAuth providers — empty on self-hosted
     */
    social_providers: Array<string>;
};

