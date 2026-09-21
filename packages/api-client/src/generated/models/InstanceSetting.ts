/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type InstanceSetting = {
    key: string;
    type: InstanceSetting.type;
    secret: boolean;
    /**
     * True when an in-app override exists
     */
    is_set: boolean;
    source: InstanceSetting.source;
    /**
     * Effective value — never returned for secret keys
     */
    value?: any;
};
export namespace InstanceSetting {
    export enum type {
        BOOL = 'bool',
        INT = 'int',
        STRING = 'string',
    }
    export enum source {
        APP = 'app',
        ENV = 'env',
        DEFAULT = 'default',
    }
}

