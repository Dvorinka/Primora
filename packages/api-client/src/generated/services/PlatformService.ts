/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BootstrapRequest } from '../models/BootstrapRequest';
import type { BootstrapResponse } from '../models/BootstrapResponse';
import type { MeResponse } from '../models/MeResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PlatformService {
    /**
     * @returns MeResponse Current authenticated user and tenancy summary
     * @throws ApiError
     */
    public static getMe(): CancelablePromise<MeResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/me',
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * @returns BootstrapResponse Platform bootstrapped
     * @throws ApiError
     */
    public static bootstrapPlatform({
        requestBody,
    }: {
        requestBody: BootstrapRequest,
    }): CancelablePromise<BootstrapResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/bootstrap',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                409: `Error response`,
            },
        });
    }
}
