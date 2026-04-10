/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProjectMember = {
    user_id: string;
    email: string;
    name: string;
    email_verified: boolean;
    role: ProjectMember.role;
    joined_at: string;
};
export namespace ProjectMember {
    export enum role {
        ADMIN = 'admin',
        DEVELOPER = 'developer',
        VIEWER = 'viewer',
    }
}

