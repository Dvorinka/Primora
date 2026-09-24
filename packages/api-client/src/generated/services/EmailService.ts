/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EmailLogListResponse } from '../models/EmailLogListResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class EmailService {
    /**
     * Recent transactional emails sent for this project (invitations etc.) — every send is logged with its outcome.
     * @returns EmailLogListResponse Email log entries
     * @throws ApiError
     */
    public static listEmailLog({
        projectId,
        limit = 50,
    }: {
        projectId: string,
        limit?: number,
    }): CancelablePromise<EmailLogListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/emails',
            path: {
                'projectID': projectId,
            },
            query: {
                'limit': limit,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
}
