/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProjectSecret } from '../models/ProjectSecret';
import type { ProjectSecretListResponse } from '../models/ProjectSecretListResponse';
import type { RevealProjectSecretResponse } from '../models/RevealProjectSecretResponse';
import type { SetProjectSecretRequest } from '../models/SetProjectSecretRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SecretsService {
    /**
     * Lists project secrets — metadata only, values are never included.
     * @returns ProjectSecretListResponse Project secrets (metadata only)
     * @throws ApiError
     */
    public static listProjectSecrets({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<ProjectSecretListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/secrets',
            path: {
                'projectID': projectId,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * Creates or replaces a project secret (AES-256-GCM at rest). Omitted url/notes keep existing values. Job payloads can reference it as secret://NAME, resolved at delivery.
     * @returns ProjectSecret Secret stored
     * @throws ApiError
     */
    public static setProjectSecret({
        projectId,
        name,
        requestBody,
    }: {
        projectId: string,
        name: string,
        requestBody: SetProjectSecretRequest,
    }): CancelablePromise<ProjectSecret> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/projects/{projectID}/secrets/{name}',
            path: {
                'projectID': projectId,
                'name': name,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                401: `Error response`,
            },
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static deleteProjectSecret({
        projectId,
        name,
    }: {
        projectId: string,
        name: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/projects/{projectID}/secrets/{name}',
            path: {
                'projectID': projectId,
                'name': name,
            },
            errors: {
                401: `Error response`,
                404: `Error response`,
            },
        });
    }
    /**
     * Returns the decrypted value. Every call is audit-logged.
     * @returns RevealProjectSecretResponse Decrypted value
     * @throws ApiError
     */
    public static revealProjectSecret({
        projectId,
        name,
    }: {
        projectId: string,
        name: string,
    }): CancelablePromise<RevealProjectSecretResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/secrets/{name}/reveal',
            path: {
                'projectID': projectId,
                'name': name,
            },
            errors: {
                401: `Error response`,
                404: `Error response`,
            },
        });
    }
}
