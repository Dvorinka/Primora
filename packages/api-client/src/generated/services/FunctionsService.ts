/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateFunctionRequest } from '../models/CreateFunctionRequest';
import type { Function } from '../models/Function';
import type { FunctionDetailResponse } from '../models/FunctionDetailResponse';
import type { FunctionListResponse } from '../models/FunctionListResponse';
import type { FunctionRun } from '../models/FunctionRun';
import type { FunctionRunListResponse } from '../models/FunctionRunListResponse';
import type { InvokeFunctionRequest } from '../models/InvokeFunctionRequest';
import type { UpdateFunctionRequest } from '../models/UpdateFunctionRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FunctionsService {
    /**
     * List functions in a project.
     * @returns FunctionListResponse Functions
     * @throws ApiError
     */
    public static listFunctions({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<FunctionListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/functions',
            path: {
                'projectID': projectId,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * Create a function (name, JS/TS code, runtime bun|deno).
     * @returns Function Created function
     * @throws ApiError
     */
    public static createFunction({
        projectId,
        requestBody,
    }: {
        projectId: string,
        requestBody: CreateFunctionRequest,
    }): CancelablePromise<Function> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/functions',
            path: {
                'projectID': projectId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
            },
        });
    }
    /**
     * Function metadata plus its source code.
     * @returns FunctionDetailResponse Function with code
     * @throws ApiError
     */
    public static getFunction({
        projectId,
        functionId,
    }: {
        projectId: string,
        functionId: string,
    }): CancelablePromise<FunctionDetailResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/functions/{functionID}',
            path: {
                'projectID': projectId,
                'functionID': functionId,
            },
            errors: {
                404: `Error response`,
            },
        });
    }
    /**
     * Update function code and/or enabled state.
     * @returns Function Updated function
     * @throws ApiError
     */
    public static updateFunction({
        projectId,
        functionId,
        requestBody,
    }: {
        projectId: string,
        functionId: string,
        requestBody: UpdateFunctionRequest,
    }): CancelablePromise<Function> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/projects/{projectID}/functions/{functionID}',
            path: {
                'projectID': projectId,
                'functionID': functionId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Error response`,
            },
        });
    }
    /**
     * Delete a function and its run history.
     * @returns void
     * @throws ApiError
     */
    public static deleteFunction({
        projectId,
        functionId,
    }: {
        projectId: string,
        functionId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/projects/{projectID}/functions/{functionID}',
            path: {
                'projectID': projectId,
                'functionID': functionId,
            },
            errors: {
                404: `Error response`,
            },
        });
    }
    /**
     * Execute the function with a JSON payload on stdin; returns the recorded run. 502 when the run fails or times out.
     * @returns FunctionRun Recorded run (status success)
     * @throws ApiError
     */
    public static invokeFunction({
        projectId,
        functionId,
        requestBody,
    }: {
        projectId: string,
        functionId: string,
        requestBody?: InvokeFunctionRequest,
    }): CancelablePromise<FunctionRun> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/functions/{functionID}/invoke',
            path: {
                'projectID': projectId,
                'functionID': functionId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Error response`,
                502: `Recorded run (status error|timeout)`,
            },
        });
    }
    /**
     * Recent runs for a function.
     * @returns FunctionRunListResponse Function runs
     * @throws ApiError
     */
    public static listFunctionRuns({
        projectId,
        functionId,
        limit = 50,
    }: {
        projectId: string,
        functionId: string,
        limit?: number,
    }): CancelablePromise<FunctionRunListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/functions/{functionID}/runs',
            path: {
                'projectID': projectId,
                'functionID': functionId,
            },
            query: {
                'limit': limit,
            },
            errors: {
                404: `Error response`,
            },
        });
    }
}
