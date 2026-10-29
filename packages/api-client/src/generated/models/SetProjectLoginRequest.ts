/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SetProjectLoginRequest = {
    username: string;
    /**
     * Plaintext — stored AES-256-GCM encrypted, never returned by list.
     */
    password: string;
    origin?: string;
    notes?: string;
};

