/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InstancePublicConfig } from '../models/InstancePublicConfig';
import type { InstanceSetting } from '../models/InstanceSetting';
import type { InstanceSettingsResponse } from '../models/InstanceSettingsResponse';
import type { UpdateInstanceSettingRequest } from '../models/UpdateInstanceSettingRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class InstanceService {
    /**
     * Public instance state for the login page — no auth required
     * @returns InstancePublicConfig Public instance configuration
     * @throws ApiError
     */
    public static getInstancePublic(): CancelablePromise<InstancePublicConfig> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/instance/public',
        });
    }
    /**
     * List instance settings (platform admin only)
     * @returns InstanceSettingsResponse Resolved instance settings
     * @throws ApiError
     */
    public static listInstanceSettings(): CancelablePromise<InstanceSettingsResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/instance/settings',
            errors: {
                401: `Error response`,
                403: `Error response`,
            },
        });
    }
    /**
     * Set an instance setting override (platform admin only)
     * @returns InstanceSetting Setting stored
     * @throws ApiError
     */
    public static updateInstanceSetting({
        key,
        requestBody,
    }: {
        key: string,
        requestBody: UpdateInstanceSettingRequest,
    }): CancelablePromise<InstanceSetting> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/instance/settings/{key}',
            path: {
                'key': key,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Error response`,
                403: `Error response`,
                404: `Error response`,
            },
        });
    }
    /**
     * Revert a setting to its env/default value (platform admin only)
     * @returns void
     * @throws ApiError
     */
    public static deleteInstanceSetting({
        key,
    }: {
        key: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/instance/settings/{key}',
            path: {
                'key': key,
            },
            errors: {
                403: `Error response`,
                404: `Error response`,
            },
        });
    }
}
