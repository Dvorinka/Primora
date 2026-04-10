/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiKey } from '../models/ApiKey';
import type { AuditLogListResponse } from '../models/AuditLogListResponse';
import type { CreateApiKeyRequest } from '../models/CreateApiKeyRequest';
import type { CreatedApiKey } from '../models/CreatedApiKey';
import type { CreateProjectRequest } from '../models/CreateProjectRequest';
import type { Project } from '../models/Project';
import type { ProjectMember } from '../models/ProjectMember';
import type { ProjectOverview } from '../models/ProjectOverview';
import type { UpdateProjectMemberRoleRequest } from '../models/UpdateProjectMemberRoleRequest';
import type { UpdateProjectRequest } from '../models/UpdateProjectRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProjectsService {
    /**
     * @returns any Projects within an organization
     * @throws ApiError
     */
    public static listProjects({
        organizationId,
        q,
    }: {
        organizationId: string,
        q?: string,
    }): CancelablePromise<{
        items: Array<Project>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/organizations/{organizationID}/projects',
            path: {
                'organizationID': organizationId,
            },
            query: {
                'q': q,
            },
        });
    }
    /**
     * @returns Project Project created
     * @throws ApiError
     */
    public static createProject({
        organizationId,
        requestBody,
    }: {
        organizationId: string,
        requestBody: CreateProjectRequest,
    }): CancelablePromise<Project> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/organizations/{organizationID}/projects',
            path: {
                'organizationID': organizationId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns ProjectOverview Aggregated project overview metrics
     * @throws ApiError
     */
    public static getProjectOverview({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<ProjectOverview> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/overview',
            path: {
                'projectID': projectId,
            },
        });
    }
    /**
     * @returns any API keys for a project
     * @throws ApiError
     */
    public static listApiKeys({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<{
        items: Array<ApiKey>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/api-keys',
            path: {
                'projectID': projectId,
            },
        });
    }
    /**
     * @returns CreatedApiKey API key created
     * @throws ApiError
     */
    public static createApiKey({
        projectId,
        requestBody,
    }: {
        projectId: string,
        requestBody: CreateApiKeyRequest,
    }): CancelablePromise<CreatedApiKey> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/api-keys',
            path: {
                'projectID': projectId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static updateProject({
        projectId,
        requestBody,
    }: {
        projectId: string,
        requestBody: UpdateProjectRequest,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/projects/{projectID}',
            path: {
                'projectID': projectId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static deleteProject({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/projects/{projectID}',
            path: {
                'projectID': projectId,
            },
        });
    }
    /**
     * @returns any Members of a project
     * @throws ApiError
     */
    public static listProjectMembers({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<{
        items: Array<ProjectMember>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/members',
            path: {
                'projectID': projectId,
            },
        });
    }
    /**
     * @returns ProjectMember Project member role updated
     * @throws ApiError
     */
    public static updateProjectMemberRole({
        projectId,
        userId,
        requestBody,
    }: {
        projectId: string,
        userId: string,
        requestBody: UpdateProjectMemberRoleRequest,
    }): CancelablePromise<ProjectMember> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/projects/{projectID}/members/{userID}',
            path: {
                'projectID': projectId,
                'userID': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static removeProjectMember({
        projectId,
        userId,
    }: {
        projectId: string,
        userId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/projects/{projectID}/members/{userID}',
            path: {
                'projectID': projectId,
                'userID': userId,
            },
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static revokeApiKey({
        projectId,
        apiKeyId,
    }: {
        projectId: string,
        apiKeyId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/projects/{projectID}/api-keys/{apiKeyID}',
            path: {
                'projectID': projectId,
                'apiKeyID': apiKeyId,
            },
        });
    }
    /**
     * @returns AuditLogListResponse Audit logs for a project
     * @throws ApiError
     */
    public static listAuditLogs({
        projectId,
        q,
        action,
        limit = 50,
        offset,
    }: {
        projectId: string,
        q?: string,
        action?: string,
        limit?: number,
        offset?: number,
    }): CancelablePromise<AuditLogListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/audit-logs',
            path: {
                'projectID': projectId,
            },
            query: {
                'q': q,
                'action': action,
                'limit': limit,
                'offset': offset,
            },
        });
    }
}
