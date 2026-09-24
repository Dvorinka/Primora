/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PresignObjectRequest = {
    /**
     * Object key inside the bucket.
     */
    key: string;
    /**
     * download → GET URL (object must exist); upload → PUT URL (creates/overwrites).
     */
    op?: PresignObjectRequest.op;
    ttl_seconds?: number;
};
export namespace PresignObjectRequest {
    /**
     * download → GET URL (object must exist); upload → PUT URL (creates/overwrites).
     */
    export enum op {
        DOWNLOAD = 'download',
        UPLOAD = 'upload',
    }
}

