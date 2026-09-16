/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { IngestRequest } from '../models/IngestRequest';
import type { IngestResponse } from '../models/IngestResponse';
import type { MetricSeriesResponse } from '../models/MetricSeriesResponse';
import type { TelemetryComponentListResponse } from '../models/TelemetryComponentListResponse';
import type { TelemetryEventListResponse } from '../models/TelemetryEventListResponse';
import type { TelemetryIssueListResponse } from '../models/TelemetryIssueListResponse';
import type { TelemetryStats } from '../models/TelemetryStats';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TelemetryService {
    /**
     * Ingest one telemetry event or a batch of up to 500
     * @returns IngestResponse Accepted event count
     * @throws ApiError
     */
    public static ingestTelemetry({
        requestBody,
    }: {
        requestBody: IngestRequest,
    }): CancelablePromise<IngestResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/ingest',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                401: `Error response`,
                413: `Error response`,
            },
        });
    }
    /**
     * @returns TelemetryEventListResponse Telemetry events, newest first
     * @throws ApiError
     */
    public static listTelemetryEvents({
        projectId,
        type,
        component,
        fingerprint,
        before,
        limit,
    }: {
        projectId: string,
        type?: 'error' | 'metric' | 'log' | 'heartbeat' | 'event',
        component?: string,
        fingerprint?: string,
        before?: number,
        limit?: number,
    }): CancelablePromise<TelemetryEventListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/events',
            path: {
                'projectID': projectId,
            },
            query: {
                'type': type,
                'component': component,
                'fingerprint': fingerprint,
                'before': before,
                'limit': limit,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * @returns TelemetryIssueListResponse Error groups by fingerprint
     * @throws ApiError
     */
    public static listTelemetryIssues({
        projectId,
        days,
    }: {
        projectId: string,
        days?: number,
    }): CancelablePromise<TelemetryIssueListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/issues',
            path: {
                'projectID': projectId,
            },
            query: {
                'days': days,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * @returns TelemetryComponentListResponse Registered telemetry components
     * @throws ApiError
     */
    public static listTelemetryComponents({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<TelemetryComponentListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/components',
            path: {
                'projectID': projectId,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static deleteTelemetryComponent({
        projectId,
        componentId,
    }: {
        projectId: string,
        componentId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/projects/{projectID}/components/{componentID}',
            path: {
                'projectID': projectId,
                'componentID': componentId,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * @returns TelemetryStats Aggregated telemetry statistics
     * @throws ApiError
     */
    public static getTelemetryStats({
        projectId,
        window,
    }: {
        projectId: string,
        window?: '1h' | '24h' | '7d' | '30d',
    }): CancelablePromise<TelemetryStats> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/telemetry/stats',
            path: {
                'projectID': projectId,
            },
            query: {
                'window': window,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * @returns MetricSeriesResponse Aggregated metric series
     * @throws ApiError
     */
    public static getTelemetryMetricSeries({
        projectId,
        name,
        window,
    }: {
        projectId: string,
        name: string,
        window?: '1h' | '24h' | '7d' | '30d',
    }): CancelablePromise<MetricSeriesResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/telemetry/metrics/series',
            path: {
                'projectID': projectId,
            },
            query: {
                'name': name,
                'window': window,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * Server-sent events stream of live telemetry. EventSource clients pass `?api_key=` or `?token=` since headers cannot be set.
     * @returns any text/event-stream of TelemetryEvent messages
     * @throws ApiError
     */
    public static streamTelemetryEvents({
        projectId,
        apiKey,
        token,
    }: {
        projectId: string,
        apiKey?: string,
        token?: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/telemetry/stream',
            path: {
                'projectID': projectId,
            },
            query: {
                'api_key': apiKey,
                'token': token,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
}
