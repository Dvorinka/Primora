/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateDBConnectionRequest } from '../models/CreateDBConnectionRequest';
import type { DBConnection } from '../models/DBConnection';
import type { DBConnectionListResponse } from '../models/DBConnectionListResponse';
import type { DBConnectionTestResult } from '../models/DBConnectionTestResult';
import type { DBDatabaseListResponse } from '../models/DBDatabaseListResponse';
import type { DBDescribeResponse } from '../models/DBDescribeResponse';
import type { DBForeignKeysResponse } from '../models/DBForeignKeysResponse';
import type { DBQueryRequest } from '../models/DBQueryRequest';
import type { DBQueryResponse } from '../models/DBQueryResponse';
import type { DBRedisRequest } from '../models/DBRedisRequest';
import type { DBRedisResponse } from '../models/DBRedisResponse';
import type { DBSchemaContextResponse } from '../models/DBSchemaContextResponse';
import type { DBTableListResponse } from '../models/DBTableListResponse';
import type { DBTransferRequest } from '../models/DBTransferRequest';
import type { DBTransferResponse } from '../models/DBTransferResponse';
import type { DBXStatus } from '../models/DBXStatus';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DatabasesService {
    /**
     * @returns DBXStatus DBX subprocess availability
     * @throws ApiError
     */
    public static getDbxStatus(): CancelablePromise<DBXStatus> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/db/status',
        });
    }
    /**
     * @returns DBConnectionListResponse Saved database connections for the project
     * @throws ApiError
     */
    public static listDbConnections({
        projectId,
    }: {
        projectId: string,
    }): CancelablePromise<DBConnectionListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/db-connections',
            path: {
                'projectID': projectId,
            },
            errors: {
                401: `Error response`,
            },
        });
    }
    /**
     * @returns DBConnection Connection created
     * @throws ApiError
     */
    public static createDbConnection({
        projectId,
        requestBody,
    }: {
        projectId: string,
        requestBody: CreateDBConnectionRequest,
    }): CancelablePromise<DBConnection> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/db-connections',
            path: {
                'projectID': projectId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Error response`,
                409: `Error response`,
            },
        });
    }
    /**
     * @returns void
     * @throws ApiError
     */
    public static deleteDbConnection({
        projectId,
        connectionId,
    }: {
        projectId: string,
        connectionId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/projects/{projectID}/db-connections/{connectionID}',
            path: {
                'projectID': projectId,
                'connectionID': connectionId,
            },
            errors: {
                404: `Error response`,
                409: `Error response`,
            },
        });
    }
    /**
     * @returns DBConnectionTestResult Connectivity probe result
     * @throws ApiError
     */
    public static testDbConnection({
        projectId,
        connectionId,
    }: {
        projectId: string,
        connectionId: string,
    }): CancelablePromise<DBConnectionTestResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/db-connections/{connectionID}/test',
            path: {
                'projectID': projectId,
                'connectionID': connectionId,
            },
            errors: {
                404: `Error response`,
            },
        });
    }
    /**
     * @returns DBDatabaseListResponse Databases reachable through the connection
     * @throws ApiError
     */
    public static listDbDatabases({
        projectId,
        connectionId,
    }: {
        projectId: string,
        connectionId: string,
    }): CancelablePromise<DBDatabaseListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/db-connections/{connectionID}/databases',
            path: {
                'projectID': projectId,
                'connectionID': connectionId,
            },
            errors: {
                404: `Error response`,
                502: `Error response`,
            },
        });
    }
    /**
     * @returns DBTableListResponse Tables, views, or collections in the connection
     * @throws ApiError
     */
    public static listDbTables({
        projectId,
        connectionId,
        database,
        schema,
    }: {
        projectId: string,
        connectionId: string,
        database?: string,
        schema?: string,
    }): CancelablePromise<DBTableListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/db-connections/{connectionID}/tables',
            path: {
                'projectID': projectId,
                'connectionID': connectionId,
            },
            query: {
                'database': database,
                'schema': schema,
            },
            errors: {
                404: `Error response`,
                502: `Error response`,
            },
        });
    }
    /**
     * @returns DBDescribeResponse Column definitions for a table
     * @throws ApiError
     */
    public static describeDbTable({
        projectId,
        connectionId,
        table,
        database,
        schema,
    }: {
        projectId: string,
        connectionId: string,
        table: string,
        database?: string,
        schema?: string,
    }): CancelablePromise<DBDescribeResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/db-connections/{connectionID}/describe',
            path: {
                'projectID': projectId,
                'connectionID': connectionId,
            },
            query: {
                'table': table,
                'database': database,
                'schema': schema,
            },
            errors: {
                404: `Error response`,
                502: `Error response`,
            },
        });
    }
    /**
     * @returns DBSchemaContextResponse Compact schema context for the connection
     * @throws ApiError
     */
    public static getDbSchemaContext({
        projectId,
        connectionId,
        database,
        schema,
    }: {
        projectId: string,
        connectionId: string,
        database?: string,
        schema?: string,
    }): CancelablePromise<DBSchemaContextResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/db-connections/{connectionID}/schema',
            path: {
                'projectID': projectId,
                'connectionID': connectionId,
            },
            query: {
                'database': database,
                'schema': schema,
            },
            errors: {
                404: `Error response`,
                502: `Error response`,
            },
        });
    }
    /**
     * @returns DBForeignKeysResponse Foreign key edges for the schema graph
     * @throws ApiError
     */
    public static listDbForeignKeys({
        projectId,
        connectionId,
        database,
        schema,
    }: {
        projectId: string,
        connectionId: string,
        database?: string,
        schema?: string,
    }): CancelablePromise<DBForeignKeysResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectID}/db-connections/{connectionID}/foreign-keys',
            path: {
                'projectID': projectId,
                'connectionID': connectionId,
            },
            query: {
                'database': database,
                'schema': schema,
            },
            errors: {
                404: `Error response`,
                502: `Error response`,
            },
        });
    }
    /**
     * @returns DBQueryResponse Query result (at most 100 rows)
     * @throws ApiError
     */
    public static executeDbQuery({
        projectId,
        connectionId,
        requestBody,
    }: {
        projectId: string,
        connectionId: string,
        requestBody: DBQueryRequest,
    }): CancelablePromise<DBQueryResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/db-connections/{connectionID}/query',
            path: {
                'projectID': projectId,
                'connectionID': connectionId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Error response`,
                502: `Error response`,
            },
        });
    }
    /**
     * @returns DBRedisResponse Redis command output
     * @throws ApiError
     */
    public static executeDbRedisCommand({
        projectId,
        connectionId,
        requestBody,
    }: {
        projectId: string,
        connectionId: string,
        requestBody: DBRedisRequest,
    }): CancelablePromise<DBRedisResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/db-connections/{connectionID}/redis',
            path: {
                'projectID': projectId,
                'connectionID': connectionId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Error response`,
                502: `Error response`,
            },
        });
    }
    /**
     * Move query results from this connection to another saved connection
     * @returns DBTransferResponse Transfer result
     * @throws ApiError
     */
    public static transferDbRows({
        projectId,
        connectionId,
        requestBody,
    }: {
        projectId: string,
        connectionId: string,
        requestBody: DBTransferRequest,
    }): CancelablePromise<DBTransferResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectID}/db-connections/{connectionID}/transfer',
            path: {
                'projectID': projectId,
                'connectionID': connectionId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Error response`,
                502: `Error response`,
            },
        });
    }
}
