/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $IntegrationAnalytics = {
    properties: {
        integration_id: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        site: {
            type: 'RybbitSite',
        },
        sites: {
            type: 'array',
            contains: {
                type: 'RybbitSite',
            },
        },
        overview: {
            properties: {
                sessions: {
                    type: 'number',
                },
                pageviews: {
                    type: 'number',
                },
                users: {
                    type: 'number',
                },
                pages_per_session: {
                    type: 'number',
                },
                bounce_rate: {
                    type: 'number',
                },
                session_duration: {
                    type: 'number',
                },
            },
        },
        series: {
            type: 'array',
            contains: {
                properties: {
                    time: {
                        type: 'string',
                    },
                    sessions: {
                        type: 'number',
                    },
                    pageviews: {
                        type: 'number',
                    },
                    users: {
                        type: 'number',
                    },
                    bounce_rate: {
                        type: 'number',
                    },
                },
            },
        },
        top_pages: {
            type: 'array',
            contains: {
                type: 'RybbitMetricItem',
            },
        },
        top_referrers: {
            type: 'array',
            contains: {
                type: 'RybbitMetricItem',
            },
        },
        window_days: {
            type: 'number',
            isRequired: true,
        },
    },
} as const;
