/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $FunctionRun = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        trigger: {
            type: 'Enum',
            isRequired: true,
        },
        status: {
            type: 'Enum',
            isRequired: true,
        },
        exit_code: {
            type: 'number',
            isNullable: true,
        },
        stdout: {
            type: 'string',
            isRequired: true,
        },
        stderr: {
            type: 'string',
            isRequired: true,
        },
        duration_ms: {
            type: 'number',
            isRequired: true,
        },
        created_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
    },
} as const;
