/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateDeployMarkerRequest } from '../models/CreateDeployMarkerRequest';
import type { CreateWebhookRequest } from '../models/CreateWebhookRequest';
import type { DeployMarker } from '../models/DeployMarker';
import type { UpdateWebhookRequest } from '../models/UpdateWebhookRequest';
import type { WebhookCreateResponse } from '../models/WebhookCreateResponse';
import type { WebhookDelivery } from '../models/WebhookDelivery';
import type { WebhookDeliveryListResponse } from '../models/WebhookDeliveryListResponse';
import type { WebhookListResponse } from '../models/WebhookListResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class WebhooksService {
    /**
     * @returns WebhookListResponse Outbound webhooks for the project
     * @throws ApiError
     */
    public static listWebhooks({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<WebhookListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/webhooks',
            path: {
                'projectID': projectId,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * Deliveries are POSTed as JSON with X-Primora-Event and X-Primora-Signature (sha256=<HMAC-SHA256 hex of the raw body, keyed by the webhook secret>). If no secret is supplied one is generated and returned once.
     * @returns WebhookCreateResponse Webhook created
     * @throws ApiError
     */
    public static createWebhook({
        projectId,
        requestBody,
    }: {
        projectId: string,
        requestBody: CreateWebhookRequest,
    }): CancelablePromise<WebhookCreateResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/webhooks',
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
     * @returns WebhookCreateResponse Webhook updated
     * @throws ApiError
     */
    public static updateWebhook({
        projectId,
        webhookId,
        requestBody,
    }: {
        projectId: string,
        webhookId: string,
        requestBody: UpdateWebhookRequest,
    }): CancelablePromise<WebhookCreateResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/projects/{projectID}/webhooks/{webhookID}',
            path: {
                'projectID': projectId,
                'webhookID': webhookId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Error response`,
            },
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static deleteWebhook({
        projectId,
        webhookId,
    }: {
        projectId: string,
        webhookId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/projects/{projectID}/webhooks/{webhookID}',
            path: {
                'projectID': projectId,
                'webhookID': webhookId,
            },
            errors: {
                404: `Error response`,
            },
        });
    }
    /**
     * @returns WebhookDeliveryListResponse Recent delivery attempts, newest first
     * @throws ApiError
     */
    public static listWebhookDeliveries({
        projectId,
        webhookId,
        limit = 50,
    }: {
        projectId: string,
        webhookId: string,
        limit?: number,
    }): CancelablePromise<WebhookDeliveryListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/webhooks/{webhookID}/deliveries',
            path: {
                'projectID': projectId,
                'webhookID': webhookId,
            },
            query: {
                'limit': limit,
            },
            errors: {
                404: `Error response`,
            },
        });
    }
    /**
     * Queues a webhook.test ping delivery.
     * @returns WebhookDelivery Test delivery queued
     * @throws ApiError
     */
    public static testWebhook({
        projectId,
        webhookId,
    }: {
        projectId: string,
        webhookId: string,
    }): CancelablePromise<WebhookDelivery> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/webhooks/{webhookID}/test',
            path: {
                'projectID': projectId,
                'webhookID': webhookId,
            },
            errors: {
                404: `Error response`,
            },
        });
    }
    /**
     * Records a deployment marker in the audit log and fires the deploy.marker webhook event.
     * @returns DeployMarker Marker recorded
     * @throws ApiError
     */
    public static createDeployMarker({
        projectId,
        requestBody,
    }: {
        projectId: string,
        requestBody: CreateDeployMarkerRequest,
    }): CancelablePromise<DeployMarker> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/deploy-markers',
            path: {
                'projectID': projectId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Error response`,
            },
        });
    }
}
