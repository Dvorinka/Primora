/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type OrganizationInvitation = {
    id: string;
    organization_id: string;
    project_id?: string | null;
    project_name?: string | null;
    email: string;
    org_role: OrganizationInvitation.org_role;
    project_role?: OrganizationInvitation.project_role | null;
    expires_at: string;
    accepted_at?: string | null;
    invited_by_user_id?: string | null;
    created_at: string;
    status: OrganizationInvitation.status;
};
export namespace OrganizationInvitation {
    export enum org_role {
        OWNER = 'owner',
        ADMIN = 'admin',
        MEMBER = 'member',
    }
    export enum project_role {
        ADMIN = 'admin',
        DEVELOPER = 'developer',
        VIEWER = 'viewer',
    }
    export enum status {
        PENDING = 'pending',
        ACCEPTED = 'accepted',
        EXPIRED = 'expired',
    }
}

