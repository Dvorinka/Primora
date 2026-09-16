/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateIntegrationRequest = {
    properties: {
        name: {
            type: 'string',
            isRequired: true,
        },
        type: {
            type: 'Enum',
            isRequired: true,
        },
        base_url: {
            type: 'string',
            description: `Root URL of the self-hosted instance, e.g. https://analytics.example.com`,
            isRequired: true,
        },
        api_key: {
            type: 'string',
            description: `Credential stored encrypted at rest; never returned by any endpoint.`,
        },
        site_id: {
            type: 'string',
        },
    },
} as const;
