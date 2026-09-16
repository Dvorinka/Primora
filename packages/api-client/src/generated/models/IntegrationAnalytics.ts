/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RybbitMetricItem } from './RybbitMetricItem';
import type { RybbitSite } from './RybbitSite';
export type IntegrationAnalytics = {
    integration_id: string;
    site?: RybbitSite;
    sites?: Array<RybbitSite>;
    overview?: {
        sessions?: number;
        pageviews?: number;
        users?: number;
        pages_per_session?: number;
        bounce_rate?: number;
        session_duration?: number;
    };
    series?: Array<{
        time?: string;
        sessions?: number;
        pageviews?: number;
        users?: number;
        bounce_rate?: number;
    }>;
    top_pages?: Array<RybbitMetricItem>;
    top_referrers?: Array<RybbitMetricItem>;
    window_days: number;
};

