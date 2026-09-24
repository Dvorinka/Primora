/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateInboundHookRequest } from '../models/CreateInboundHookRequest';
import type { InboundHook } from '../models/InboundHook';
import type { InboundHookListResponse } from '../models/InboundHookListResponse';
import type { InboundReceiveResponse } from '../models/InboundReceiveResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class InboundService {
    /**
     * Lists inbound webhook endpoints for the project.
     * @returns InboundHookListResponse Inbound hooks
     * @throws ApiError
     */
    public static listInboundHooks({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<InboundHookListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/inbound-hooks',
            path: {
                'projectID': projectId,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * Creates an inbound hook. `event` mode republishes bodies as `inbound.received` domain events; `job` mode triggers a scheduled-job run with the body as its payload. Set `secret` to require `X-Primora-Signature` (HMAC-SHA256 over the raw body).
     * @returns InboundHook Inbound hook created
     * @throws ApiError
     */
    public static createInboundHook({
        projectId,
        requestBody,
    }: {
        projectId: string,
        requestBody: CreateInboundHookRequest,
    }): CancelablePromise<InboundHook> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/inbound-hooks',
            path: {
                'projectID': projectId,
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
    public static deleteInboundHook({
        projectId,
        hookId,
    }: {
        projectId: string,
        hookId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/projects/{projectID}/inbound-hooks/{hookID}',
            path: {
                'projectID': projectId,
                'hookID': hookId,
            },
            errors: {
                401: `Error response`,
                404: `Error response`,
            },
        });
    }
    /**
     * Public ingest endpoint — the URL token is the credential. Body must be JSON (max 256 KiB); sign with X-Primora-Signature when the hook has a secret.
     * @returns InboundReceiveResponse Accepted
     * @throws ApiError
     */
    public static receiveInboundHook({
        token,
        xPrimoraSignature,
        requestBody,
    }: {
        token: string,
        xPrimoraSignature?: string,
        requestBody?: Record<string, any>,
    }): CancelablePromise<InboundReceiveResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/hooks/{token}',
            path: {
                'token': token,
            },
            headers: {
                'X-Primora-Signature': xPrimoraSignature,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                401: `Error response`,
                404: `Error response`,
            },
        });
    }
}
