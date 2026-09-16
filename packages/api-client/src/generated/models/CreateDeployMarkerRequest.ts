/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateDeployMarkerRequest = {
    version?: string;
    /**
     * Git SHA, tag or branch being deployed.
     */
    ref?: string;
    environment?: string;
    note?: string;
};

