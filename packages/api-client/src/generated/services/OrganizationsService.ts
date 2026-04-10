/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AcceptInvitationRequest } from '../models/AcceptInvitationRequest';
import type { CreateInvitationRequest } from '../models/CreateInvitationRequest';
import type { CreateOrganizationRequest } from '../models/CreateOrganizationRequest';
import type { Invitation } from '../models/Invitation';
import type { OrganizationInvitation } from '../models/OrganizationInvitation';
import type { OrganizationMember } from '../models/OrganizationMember';
import type { OrganizationMembership } from '../models/OrganizationMembership';
import type { UpdateOrganizationMemberRoleRequest } from '../models/UpdateOrganizationMemberRoleRequest';
import type { UpdateOrganizationRequest } from '../models/UpdateOrganizationRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OrganizationsService {
    /**
     * @returns any Organizations for the current user
     * @throws ApiError
     */
    public static listOrganizations(): CancelablePromise<{
        items: Array<OrganizationMembership>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/organizations',
        });
    }
    /**
     * @returns OrganizationMembership Organization created
     * @throws ApiError
     */
    public static createOrganization({
        requestBody,
    }: {
        requestBody: CreateOrganizationRequest,
    }): CancelablePromise<OrganizationMembership> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/organizations',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static updateOrganization({
        organizationId,
        requestBody,
    }: {
        organizationId: string,
        requestBody: UpdateOrganizationRequest,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/organizations/{organizationID}',
            path: {
                'organizationID': organizationId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static deleteOrganization({
        organizationId,
    }: {
        organizationId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/organizations/{organizationID}',
            path: {
                'organizationID': organizationId,
            },
        });
    }
    /**
     * @returns any Members of an organization
     * @throws ApiError
     */
    public static listOrganizationMembers({
        organizationId,
    }: {
        organizationId: string,
    }): CancelablePromise<{
        items: Array<OrganizationMember>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/organizations/{organizationID}/members',
            path: {
                'organizationID': organizationId,
            },
        });
    }
    /**
     * @returns OrganizationMember Organization member role updated
     * @throws ApiError
     */
    public static updateOrganizationMemberRole({
        organizationId,
        userId,
        requestBody,
    }: {
        organizationId: string,
        userId: string,
        requestBody: UpdateOrganizationMemberRoleRequest,
    }): CancelablePromise<OrganizationMember> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/organizations/{organizationID}/members/{userID}',
            path: {
                'organizationID': organizationId,
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
    public static removeOrganizationMember({
        organizationId,
        userId,
    }: {
        organizationId: string,
        userId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/organizations/{organizationID}/members/{userID}',
            path: {
                'organizationID': organizationId,
                'userID': userId,
            },
        });
    }
    /**
     * @returns any Invitations for an organization
     * @throws ApiError
     */
    public static listOrganizationInvitations({
        organizationId,
    }: {
        organizationId: string,
    }): CancelablePromise<{
        items: Array<OrganizationInvitation>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/organizations/{organizationID}/invitations',
            path: {
                'organizationID': organizationId,
            },
        });
    }
    /**
     * @returns Invitation Invitation created
     * @throws ApiError
     */
    public static createInvitation({
        organizationId,
        requestBody,
    }: {
        organizationId: string,
        requestBody: CreateInvitationRequest,
    }): CancelablePromise<Invitation> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/organizations/{organizationID}/invitations',
            path: {
                'organizationID': organizationId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static revokeInvitation({
        organizationId,
        invitationId,
    }: {
        organizationId: string,
        invitationId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/organizations/{organizationID}/invitations/{invitationID}',
            path: {
                'organizationID': organizationId,
                'invitationID': invitationId,
            },
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static acceptInvitation({
        requestBody,
    }: {
        requestBody: AcceptInvitationRequest,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/invitations/accept',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
