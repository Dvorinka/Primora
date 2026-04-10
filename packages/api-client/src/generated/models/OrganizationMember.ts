/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type OrganizationMember = {
    user_id: string;
    email: string;
    name: string;
    email_verified: boolean;
    role: OrganizationMember.role;
    joined_at: string;
};
export namespace OrganizationMember {
    export enum role {
        OWNER = 'owner',
        ADMIN = 'admin',
        MEMBER = 'member',
    }
}

