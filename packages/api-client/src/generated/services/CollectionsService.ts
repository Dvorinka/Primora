/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Collection } from '../models/Collection';
import type { CollectionListResponse } from '../models/CollectionListResponse';
import type { CreateCollectionRequest } from '../models/CreateCollectionRequest';
import type { CreateDocumentRequest } from '../models/CreateDocumentRequest';
import type { Document } from '../models/Document';
import type { DocumentListResponse } from '../models/DocumentListResponse';
import type { UpdateCollectionRequest } from '../models/UpdateCollectionRequest';
import type { UpdateDocumentRequest } from '../models/UpdateDocumentRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CollectionsService {
    /**
     * @returns CollectionListResponse List of collections in the project
     * @throws ApiError
     */
    public static listCollections({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<CollectionListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/collections',
            path: {
                'projectID': projectId,
            },
        });
    }
    /**
     * @returns Collection Collection created
     * @throws ApiError
     */
    public static createCollection({
        projectId,
        requestBody,
    }: {
        projectId: string,
        requestBody: CreateCollectionRequest,
    }): CancelablePromise<Collection> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/collections',
            path: {
                'projectID': projectId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns Collection Collection details
     * @throws ApiError
     */
    public static getCollection({
        projectId,
        collectionId,
    }: {
        projectId: string,
        collectionId: string,
    }): CancelablePromise<Collection> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/collections/{collectionID}',
            path: {
                'projectID': projectId,
                'collectionID': collectionId,
            },
        });
    }
    /**
     * @returns Collection Collection updated
     * @throws ApiError
     */
    public static updateCollection({
        projectId,
        collectionId,
        requestBody,
    }: {
        projectId: string,
        collectionId: string,
        requestBody: UpdateCollectionRequest,
    }): CancelablePromise<Collection> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/projects/{projectID}/collections/{collectionID}',
            path: {
                'projectID': projectId,
                'collectionID': collectionId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static deleteCollection({
        projectId,
        collectionId,
    }: {
        projectId: string,
        collectionId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/projects/{projectID}/collections/{collectionID}',
            path: {
                'projectID': projectId,
                'collectionID': collectionId,
            },
        });
    }
    /**
     * @returns DocumentListResponse List of documents in the collection
     * @throws ApiError
     */
    public static listDocuments({
        collectionId,
        limit = 50,
        offset,
    }: {
        collectionId: string,
        limit?: number,
        offset?: number,
    }): CancelablePromise<DocumentListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/collections/{collectionID}/documents',
            path: {
                'collectionID': collectionId,
            },
            query: {
                'limit': limit,
                'offset': offset,
            },
        });
    }
    /**
     * @returns Document Document created
     * @throws ApiError
     */
    public static createDocument({
        collectionId,
        requestBody,
    }: {
        collectionId: string,
        requestBody: CreateDocumentRequest,
    }): CancelablePromise<Document> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/collections/{collectionID}/documents',
            path: {
                'collectionID': collectionId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns Document Document details
     * @throws ApiError
     */
    public static getDocument({
        collectionId,
        documentId,
    }: {
        collectionId: string,
        documentId: string,
    }): CancelablePromise<Document> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/collections/{collectionID}/documents/{documentID}',
            path: {
                'collectionID': collectionId,
                'documentID': documentId,
            },
        });
    }
    /**
     * @returns Document Document updated
     * @throws ApiError
     */
    public static updateDocument({
        collectionId,
        documentId,
        requestBody,
    }: {
        collectionId: string,
        documentId: string,
        requestBody: UpdateDocumentRequest,
    }): CancelablePromise<Document> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/collections/{collectionID}/documents/{documentID}',
            path: {
                'collectionID': collectionId,
                'documentID': documentId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static deleteDocument({
        collectionId,
        documentId,
    }: {
        collectionId: string,
        documentId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/collections/{collectionID}/documents/{documentID}',
            path: {
                'collectionID': collectionId,
                'documentID': documentId,
            },
        });
    }
}
