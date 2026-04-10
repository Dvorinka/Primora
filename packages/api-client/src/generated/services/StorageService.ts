/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Bucket } from '../models/Bucket';
import type { BucketObject } from '../models/BucketObject';
import type { BucketObjectListResponse } from '../models/BucketObjectListResponse';
import type { CopyBucketObjectRequest } from '../models/CopyBucketObjectRequest';
import type { CreateBucketRequest } from '../models/CreateBucketRequest';
import type { UpdateBucketObjectRequest } from '../models/UpdateBucketObjectRequest';
import type { UpdateBucketRequest } from '../models/UpdateBucketRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StorageService {
    /**
     * @returns any Buckets for a project
     * @throws ApiError
     */
    public static listBuckets({
        projectId,
        q,
    }: {
        projectId: string,
        q?: string,
    }): CancelablePromise<{
        items: Array<Bucket>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/buckets',
            path: {
                'projectID': projectId,
            },
            query: {
                'q': q,
            },
        });
    }
    /**
     * @returns Bucket Bucket created
     * @throws ApiError
     */
    public static createBucket({
        projectId,
        requestBody,
    }: {
        projectId: string,
        requestBody: CreateBucketRequest,
    }): CancelablePromise<Bucket> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/buckets',
            path: {
                'projectID': projectId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns BucketObjectListResponse Bucket objects
     * @throws ApiError
     */
    public static listBucketObjects({
        bucketId,
        q,
        limit = 50,
        offset,
    }: {
        bucketId: string,
        q?: string,
        limit?: number,
        offset?: number,
    }): CancelablePromise<BucketObjectListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/buckets/{bucketID}/objects',
            path: {
                'bucketID': bucketId,
            },
            query: {
                'q': q,
                'limit': limit,
                'offset': offset,
            },
        });
    }
    /**
     * @returns BucketObject Bucket object created
     * @throws ApiError
     */
    public static uploadBucketObject({
        bucketId,
        formData,
    }: {
        bucketId: string,
        formData: {
            objectKey?: string;
            file: Blob;
        },
    }): CancelablePromise<BucketObject> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/buckets/{bucketID}/objects',
            path: {
                'bucketID': bucketId,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
        });
    }
    /**
     * @returns BucketObject Bucket object copied
     * @throws ApiError
     */
    public static copyBucketObject({
        bucketId,
        requestBody,
    }: {
        bucketId: string,
        requestBody: CopyBucketObjectRequest,
    }): CancelablePromise<BucketObject> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/buckets/{bucketID}/object-copies',
            path: {
                'bucketID': bucketId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static updateBucket({
        bucketId,
        requestBody,
    }: {
        bucketId: string,
        requestBody: UpdateBucketRequest,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/buckets/{bucketID}',
            path: {
                'bucketID': bucketId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static deleteBucket({
        bucketId,
    }: {
        bucketId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/buckets/{bucketID}',
            path: {
                'bucketID': bucketId,
            },
        });
    }
    /**
     * @returns binary Bucket object bytes
     * @throws ApiError
     */
    public static downloadBucketObject({
        bucketId,
        objectKey,
    }: {
        bucketId: string,
        objectKey: string,
    }): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/buckets/{bucketID}/objects/{objectKey}',
            path: {
                'bucketID': bucketId,
                'objectKey': objectKey,
            },
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static updateBucketObject({
        bucketId,
        objectKey,
        requestBody,
    }: {
        bucketId: string,
        objectKey: string,
        requestBody: UpdateBucketObjectRequest,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/buckets/{bucketID}/objects/{objectKey}',
            path: {
                'bucketID': bucketId,
                'objectKey': objectKey,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static deleteBucketObject({
        bucketId,
        objectKey,
    }: {
        bucketId: string,
        objectKey: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/buckets/{bucketID}/objects/{objectKey}',
            path: {
                'bucketID': bucketId,
                'objectKey': objectKey,
            },
        });
    }
}
