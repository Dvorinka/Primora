/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AlertRule } from '../models/AlertRule';
import type { AlertRuleListResponse } from '../models/AlertRuleListResponse';
import type { UpsertAlertRuleRequest } from '../models/UpsertAlertRuleRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AlertsService {
    /**
     * Lists telemetry alert rules for the project.
     * @returns AlertRuleListResponse Alert rules
     * @throws ApiError
     */
    public static listAlertRules({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<AlertRuleListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/alerts',
            path: {
                'projectID': projectId,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * Creates an alert rule. Rules fire `alert.fired`/`alert.resolved` domain events on state transitions — subscribe a webhook to those event types to receive them.
     * @returns AlertRule Alert rule created
     * @throws ApiError
     */
    public static createAlertRule({
        projectId,
        requestBody,
    }: {
        projectId: string,
        requestBody: UpsertAlertRuleRequest,
    }): CancelablePromise<AlertRule> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/alerts',
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
     * @returns AlertRule Alert rule updated
     * @throws ApiError
     */
    public static updateAlertRule({
        projectId,
        ruleId,
        requestBody,
    }: {
        projectId: string,
        ruleId: string,
        requestBody: UpsertAlertRuleRequest,
    }): CancelablePromise<AlertRule> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/projects/{projectID}/alerts/{ruleID}',
            path: {
                'projectID': projectId,
                'ruleID': ruleId,
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
    /**
     * @returns void
     * @throws ApiError
     */
    public static deleteAlertRule({
        projectId,
        ruleId,
    }: {
        projectId: string,
        ruleId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/projects/{projectID}/alerts/{ruleID}',
            path: {
                'projectID': projectId,
                'ruleID': ruleId,
            },
            errors: {
                401: `Error response`,
                404: `Error response`,
            },
        });
    }
}
