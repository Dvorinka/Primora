/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DBForeignKeyEdge = {
    properties: {
        schema: {
            type: 'string',
        },
        table: {
            type: 'string',
            isRequired: true,
        },
        column: {
            type: 'string',
            isRequired: true,
        },
        ref_schema: {
            type: 'string',
        },
        ref_table: {
            type: 'string',
            isRequired: true,
        },
        ref_column: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;
