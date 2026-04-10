/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { HealthStatus } from '../models/HealthStatus';
import type { ReadinessStatus } from '../models/ReadinessStatus';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HealthService {
    /**
     * @returns HealthStatus Liveness check
     * @throws ApiError
     */
    public static getLiveness(): CancelablePromise<HealthStatus> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health/liveness',
        });
    }
    /**
     * @returns ReadinessStatus Readiness check
     * @throws ApiError
     */
    public static getReadiness(): CancelablePromise<ReadinessStatus> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health/readiness',
        });
    }
}
