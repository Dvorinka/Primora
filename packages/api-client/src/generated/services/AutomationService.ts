/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateScheduledJobRequest } from '../models/CreateScheduledJobRequest';
import type { PublishEventRequest } from '../models/PublishEventRequest';
import type { ScheduledJobCreateResponse } from '../models/ScheduledJobCreateResponse';
import type { ScheduledJobListResponse } from '../models/ScheduledJobListResponse';
import type { ScheduledJobRun } from '../models/ScheduledJobRun';
import type { ScheduledJobRunListResponse } from '../models/ScheduledJobRunListResponse';
import type { UpdateScheduledJobRequest } from '../models/UpdateScheduledJobRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AutomationService {
    /**
     * Publishes a client-authored domain event. Type must be in the custom.* namespace; the event fans out to realtime subscribers, matching webhooks, and event_pattern functions.
     * @returns any Event accepted for fan-out
     * @throws ApiError
     */
    public static publishProjectEvent({
        projectId,
        requestBody,
    }: {
        projectId: string,
        requestBody: PublishEventRequest,
    }): CancelablePromise<{
        published?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/events',
            path: {
                'projectID': projectId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                401: `Error response`,
                403: `Error response`,
            },
        });
    }
    /**
     * @returns ScheduledJobListResponse Scheduled jobs for the project
     * @throws ApiError
     */
    public static listScheduledJobs({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<ScheduledJobListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/jobs',
            path: {
                'projectID': projectId,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * Runs a signed POST to the job URL on a cron schedule (standard 5-field cron or @every/@hourly descriptors). Payload is signed X-Primora-Signature like webhook deliveries; an empty secret generates one returned once. HTTPS required for public targets, HTTP allowed for private/self-hosted.
     * @returns ScheduledJobCreateResponse Job created
     * @throws ApiError
     */
    public static createScheduledJob({
        projectId,
        requestBody,
    }: {
        projectId: string,
        requestBody: CreateScheduledJobRequest,
    }): CancelablePromise<ScheduledJobCreateResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/jobs',
            path: {
                'projectID': projectId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                401: `Error response`,
                409: `Error response`,
            },
        });
    }
    /**
     * @returns ScheduledJobCreateResponse Job updated
     * @throws ApiError
     */
    public static updateScheduledJob({
        projectId,
        jobId,
        requestBody,
    }: {
        projectId: string,
        jobId: string,
        requestBody: UpdateScheduledJobRequest,
    }): CancelablePromise<ScheduledJobCreateResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/projects/{projectID}/jobs/{jobID}',
            path: {
                'projectID': projectId,
                'jobID': jobId,
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
    public static deleteScheduledJob({
        projectId,
        jobId,
    }: {
        projectId: string,
        jobId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/projects/{projectID}/jobs/{jobID}',
            path: {
                'projectID': projectId,
                'jobID': jobId,
            },
            errors: {
                404: `Error response`,
            },
        });
    }
    /**
     * Recent executions, newest first. History is capped at 200 runs per job.
     * @returns ScheduledJobRunListResponse Job run history
     * @throws ApiError
     */
    public static listScheduledJobRuns({
        projectId,
        jobId,
        limit = 50,
    }: {
        projectId: string,
        jobId: string,
        limit?: number,
    }): CancelablePromise<ScheduledJobRunListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/jobs/{jobID}/runs',
            path: {
                'projectID': projectId,
                'jobID': jobId,
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
     * Triggers an out-of-schedule manual run. Returns the run row in "running" state.
     * @returns ScheduledJobRun Manual run queued
     * @throws ApiError
     */
    public static runScheduledJob({
        projectId,
        jobId,
    }: {
        projectId: string,
        jobId: string,
    }): CancelablePromise<ScheduledJobRun> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/jobs/{jobID}/run',
            path: {
                'projectID': projectId,
                'jobID': jobId,
            },
            errors: {
                404: `Error response`,
            },
        });
    }
    /**
     * Server-sent events stream of project domain events — document/object mutations, new issues, deploy markers, job runs. EventSource clients pass `?api_key=` or `?token=` since headers cannot be set.
     * @returns any text/event-stream of {type, occurred_at, data} messages
     * @throws ApiError
     */
    public static streamRealtimeEvents({
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
            url: '/projects/{projectID}/realtime/stream',
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
    /**
     * Count of clients currently subscribed to the project's realtime stream. The stream also emits presence.update events on every join/leave.
     * @returns any Online subscriber count
     * @throws ApiError
     */
    public static getRealtimePresence({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<{
        online?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/realtime/presence',
            path: {
                'projectID': projectId,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
}
