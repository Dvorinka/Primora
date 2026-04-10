/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateBucketRequest = {
    name: string;
    slug: string;
    visibility: UpdateBucketRequest.visibility;
};
export namespace UpdateBucketRequest {
    export enum visibility {
        PRIVATE = 'private',
        PUBLIC = 'public',
    }
}

