/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EmailLogEntry = {
    id: string;
    template: string;
    to_email: string;
    subject: string;
    status: EmailLogEntry.status;
    error?: string;
    created_at: string;
};
export namespace EmailLogEntry {
    export enum status {
        SENT = 'sent',
        FAILED = 'failed',
    }
}

