/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateInvitationRequest = {
    email: string;
    orgRole: CreateInvitationRequest.orgRole;
    projectId?: string | null;
    projectRole?: CreateInvitationRequest.projectRole | null;
    redirectUrl?: string | null;
};
export namespace CreateInvitationRequest {
    export enum orgRole {
        OWNER = 'owner',
        ADMIN = 'admin',
        MEMBER = 'member',
    }
    export enum projectRole {
        ADMIN = 'admin',
        DEVELOPER = 'developer',
        VIEWER = 'viewer',
    }
}

