/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DBForeignKeysResponse = {
    properties: {
        edges: {
            type: 'array',
            contains: {
                type: 'DBForeignKeyEdge',
            },
            isRequired: true,
        },
        raw: {
            type: 'string',
        },
        note: {
            type: 'string',
        },
    },
} as const;
