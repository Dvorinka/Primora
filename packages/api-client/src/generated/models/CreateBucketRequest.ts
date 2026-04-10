/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateBucketRequest = {
    name: string;
    slug: string;
    visibility: CreateBucketRequest.visibility;
};
export namespace CreateBucketRequest {
    export enum visibility {
        PRIVATE = 'private',
        PUBLIC = 'public',
    }
}

