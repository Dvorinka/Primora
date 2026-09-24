/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateInboundHookRequest = {
    properties: {
        name: {
            type: 'string',
            isRequired: true,
        },
        mode: {
            type: 'Enum',
        },
        job_id: {
            type: 'string',
            description: `Required when mode=job — scheduled job to trigger.`,
        },
        function_id: {
            type: 'string',
            description: `Required when mode=function — invoked with the received body.`,
        },
        secret: {
            type: 'string',
            description: `Optional — stored encrypted; callers must then sign bodies with X-Primora-Signature.`,
        },
        enabled: {
            type: 'boolean',
        },
    },
} as const;
