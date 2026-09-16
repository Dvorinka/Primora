/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ComponentHealth } from './ComponentHealth';
import type { EventSeriesBucket } from './EventSeriesBucket';
export type TelemetryStats = {
    window: number;
    bucket_sec: number;
    series: Array<EventSeriesBucket>;
    components: Array<ComponentHealth>;
    errors: number;
    events: number;
    metrics: number;
    metric_names: Array<string>;
};

