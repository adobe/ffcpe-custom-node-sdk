/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import type { Output, FfcpeInput } from "../types/contract.js";
import type { JobStore } from "../types/job-store.js";
import type { Logger } from "../types/logger.js";
import type { FfcpeNodeWorkerContext } from "./worker-handler.js";
import { FfcpeJobFailedError } from "./job-failed-error.js";

/** Inputs to a single worker invocation (after HTTP submit has validated the request). */
export interface WorkerPayload {
    jobId: string;
    inputs: FfcpeInput[];
    /** Workflow parameters from run-workflow. */
    params: Record<string, unknown>;
    authContext?: Record<string, unknown>;
    /** Full invocation arguments (same object the worker entrypoint receives). */
    args: Record<string, unknown>;
}

/** Successful worker invocation envelope (HTTP-like status + JSON body). */
export interface WorkerInvokeSuccess<T> {
    statusCode: number;
    headers: Record<string, string>;
    body: T;
}

/** Worker invocation failure envelope (logical HTTP error). */
export interface WorkerInvokeError {
    error: {
        statusCode: number;
        body: { error: string };
    };
}

export type WorkerInvokeResult =
    | WorkerInvokeSuccess<{ jobId: string; status: "completed" | "failed"; message: string }>
    | WorkerInvokeError;

export interface RunWorkerJobOptions {
    jobStore: JobStore;
    logger: Logger;
    execute: (ctx: FfcpeNodeWorkerContext) => Promise<Output[]>;
    payload: WorkerPayload;
}

async function safeFailJob(
    jobStore: JobStore,
    jobId: string,
    errorMessage: string,
    logger: Logger,
): Promise<void> {
    try {
        await jobStore.fail(jobId, errorMessage);
        logger.info(`Job ${jobId} marked as failed`);
    } catch (stateError) {
        logger.error(`Failed to update job state: ${String(stateError)}`);
    }
}

/**
 * Runs the worker `execute` hook, persists completion or failure via the {@link JobStore}.
 */
export async function runWorkerJob(options: RunWorkerJobOptions): Promise<WorkerInvokeResult> {
    const { jobStore, logger, execute, payload } = options;
    const { jobId, inputs, authContext, params, args } = payload;
    try {
        if (!jobId) {
            return {
                error: {
                    statusCode: 400,
                    body: { error: "Missing jobId parameter" },
                },
            };
        }

        logger.info(`Worker started for job ${jobId}...`);
        const outputs = await execute({
            jobId,
            inputs,
            logger,
            authContext,
            params,
            args,
        });
        await jobStore.complete(jobId, outputs);
        logger.info(`Job ${jobId} completed successfully`);
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: {
                jobId,
                status: "completed" as const,
                message: "Processing completed successfully",
            },
        };
    } catch (error) {
        if (error instanceof FfcpeJobFailedError) {
            await safeFailJob(jobStore, jobId, error.message, logger);
            logger.info(`Job ${jobId} failed (handler): ${error.message}`);
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    jobId,
                    status: "failed" as const,
                    message: error.message,
                },
            };
        }
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Worker failed for job ${jobId}: ${message}`);
        await safeFailJob(jobStore, jobId, message, logger);
        return {
            error: {
                body: { error: `Processing failed: ${message}` },
                statusCode: 500,
            },
        };
    }
}
