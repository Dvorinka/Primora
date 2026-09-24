/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PresignedURL = {
    /**
     * Fully-signed URL — call it with the returned method, no auth header needed.
     */
    url: string;
    method: PresignedURL.method;
    expires_at: string;
};
export namespace PresignedURL {
    export enum method {
        GET = 'GET',
        PUT = 'PUT',
    }
}

