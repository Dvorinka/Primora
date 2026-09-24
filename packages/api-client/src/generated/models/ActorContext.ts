/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ContextRef } from './ContextRef';
export type ActorContext = {
    actor: ActorContext.actor;
    scopes?: Array<string>;
    key_prefix?: string;
    organization?: ContextRef;
    project?: ContextRef;
};
export namespace ActorContext {
    export enum actor {
        USER = 'user',
        API_KEY = 'api_key',
    }
}

