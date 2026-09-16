/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateIntegrationRequest } from '../models/CreateIntegrationRequest';
import type { Integration } from '../models/Integration';
import type { IntegrationAnalytics } from '../models/IntegrationAnalytics';
import type { IntegrationListResponse } from '../models/IntegrationListResponse';
import type { IntegrationTestResult } from '../models/IntegrationTestResult';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class IntegrationsService {
    /**
     * @returns IntegrationListResponse External service integrations for the project
     * @throws ApiError
     */
    public static listIntegrations({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<IntegrationListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/integrations',
            path: {
                'projectID': projectId,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * @returns Integration Integration created
     * @throws ApiError
     */
    public static createIntegration({
        projectId,
        requestBody,
    }: {
        projectId: string,
        requestBody: CreateIntegrationRequest,
    }): CancelablePromise<Integration> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/integrations',
            path: {
                'projectID': projectId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Error response`,
                409: `Error response`,
            },
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static deleteIntegration({
        projectId,
        integrationId,
    }: {
        projectId: string,
        integrationId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/projects/{projectID}/integrations/{integrationID}',
            path: {
                'projectID': projectId,
                'integrationID': integrationId,
            },
            errors: {
                404: `Error response`,
            },
        });
    }
    /**
     * Health check — HTTP GET against the integration's base URL with stored credentials (~5s timeout). Updates status and last_health_at.
     * @returns IntegrationTestResult Connectivity probe result
     * @throws ApiError
     */
    public static testIntegration({
        projectId,
        integrationId,
    }: {
        projectId: string,
        integrationId: string,
    }): CancelablePromise<IntegrationTestResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/integrations/{integrationID}/test',
            path: {
                'projectID': projectId,
                'integrationID': integrationId,
            },
            errors: {
                404: `Error response`,
            },
        });
    }
    /**
     * Read-only analytics pulled from the integration (Rybbit). The API key never leaves the server.
     * @returns IntegrationAnalytics Normalized analytics payload
     * @throws ApiError
     */
    public static getIntegrationAnalytics({
        projectId,
        integrationId,
        site,
        days = 30,
    }: {
        projectId: string,
        integrationId: string,
        /**
         * Rybbit site id override; defaults to the integration's configured site, else first accessible site.
         */
        site?: string,
        days?: number,
    }): CancelablePromise<IntegrationAnalytics> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/integrations/{integrationID}/analytics',
            path: {
                'projectID': projectId,
                'integrationID': integrationId,
            },
            query: {
                'site': site,
                'days': days,
            },
            errors: {
                400: `Error response`,
                404: `Error response`,
                502: `Error response`,
            },
        });
    }
}
