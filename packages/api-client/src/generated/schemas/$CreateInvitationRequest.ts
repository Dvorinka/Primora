/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateInvitationRequest = {
    properties: {
        email: {
            type: 'string',
            isRequired: true,
            format: 'email',
        },
        orgRole: {
            type: 'Enum',
            isRequired: true,
        },
        projectId: {
            type: 'string',
            isNullable: true,
            format: 'uuid',
        },
        projectRole: {
            type: 'Enum',
            isNullable: true,
        },
        redirectUrl: {
            type: 'string',
            isNullable: true,
            format: 'uri',
        },
    },
} as const;
