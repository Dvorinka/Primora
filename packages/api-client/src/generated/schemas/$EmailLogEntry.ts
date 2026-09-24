/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EmailLogEntry = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        template: {
            type: 'string',
            isRequired: true,
        },
        to_email: {
            type: 'string',
            isRequired: true,
        },
        subject: {
            type: 'string',
            isRequired: true,
        },
        status: {
            type: 'Enum',
            isRequired: true,
        },
        error: {
            type: 'string',
        },
        created_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
    },
} as const;
