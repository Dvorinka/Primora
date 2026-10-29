/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProjectLogin } from '../models/ProjectLogin';
import type { ProjectLoginListResponse } from '../models/ProjectLoginListResponse';
import type { ProjectSecret } from '../models/ProjectSecret';
import type { ProjectSecretListResponse } from '../models/ProjectSecretListResponse';
import type { RevealProjectLoginResponse } from '../models/RevealProjectLoginResponse';
import type { RevealProjectSecretResponse } from '../models/RevealProjectSecretResponse';
import type { SetProjectLoginRequest } from '../models/SetProjectLoginRequest';
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
    /**
     * Lists app logins — username and origin, never the password.
     * @returns ProjectLoginListResponse Project logins (password omitted)
     * @throws ApiError
     */
    public static listProjectLogins({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<ProjectLoginListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/logins',
            path: {
                'projectID': projectId,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * Creates or replaces an app login. The password is AES-256-GCM at rest. Omitted origin/notes keep existing values. The app id is stable — it is not a host or port.
     * @returns ProjectLogin Login stored
     * @throws ApiError
     */
    public static setProjectLogin({
        projectId,
        app,
        requestBody,
    }: {
        projectId: string,
        /**
         * Stable app id. Not a URL and not a port.
         */
        app: string,
        requestBody: SetProjectLoginRequest,
    }): CancelablePromise<ProjectLogin> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/projects/{projectID}/logins/{app}',
            path: {
                'projectID': projectId,
                'app': app,
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
    public static deleteProjectLogin({
        projectId,
        app,
    }: {
        projectId: string,
        /**
         * Stable app id. Not a URL and not a port.
         */
        app: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/projects/{projectID}/logins/{app}',
            path: {
                'projectID': projectId,
                'app': app,
            },
            errors: {
                401: `Error response`,
                404: `Error response`,
            },
        });
    }
    /**
     * Returns the username, password, and origin for one app. Every call is audit-logged. Read one login when you need it. Do not copy it into chat or a .env file.
     * @returns RevealProjectLoginResponse Decrypted login
     * @throws ApiError
     */
    public static revealProjectLogin({
        projectId,
        app,
    }: {
        projectId: string,
        /**
         * Stable app id. Not a URL and not a port.
         */
        app: string,
    }): CancelablePromise<RevealProjectLoginResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/logins/{app}/reveal',
            path: {
                'projectID': projectId,
                'app': app,
            },
            errors: {
                401: `Error response`,
                404: `Error response`,
            },
        });
    }
}
