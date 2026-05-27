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

import type {
    JobStore,
    FfcpeInput,
    FfcpeNodeWorkerHandler,
    WorkerInvokeResult,
} from "@adobe/ffcpe-custom-node-core";
import { runWorkerJob, FfcpeJobFailedError } from "@adobe/ffcpe-custom-node-core";
import { createAioJobStore } from "../job/aio-job-store.js";
import { createAioLogger } from "../logging/aio-logger.js";

export interface CreateFfcpeNodeWorkerOptions {
    jobStore?: JobStore;
    loggerName?: string;
    /**
     * Input names (catalog port identifiers — the `port` field on each input) that must be present.
     * `name` on the input is the asset/file display name and is *not* what's matched here.
     */
    requiredInputNames?: readonly string[];
}

function validateRequiredInputs(
    required: readonly string[] | undefined,
    inputs: FfcpeInput[],
): string | null {
    if (!required?.length) return null;
    const ports = new Set(inputs.map((i) => i.port));
    for (const name of required) {
        if (!ports.has(name)) {
            return `Missing required input: ${name}`;
        }
    }
    return null;
}

function workflowParamsFromArgs(args: Record<string, unknown>): Record<string, unknown> {
    const p = args.params;
    if (p !== undefined && typeof p === "object" && !Array.isArray(p)) {
        return p as Record<string, unknown>;
    }
    return {};
}

/**
 * OpenWhisk worker entry for a FFCPE custom node: validates inputs, runs your handler, persists outputs.
 *
 * Returns the action `main(args)` function expected by App Builder / OpenWhisk.
 */
export function createFfcpeNodeWorker(
    handler: FfcpeNodeWorkerHandler,
    options?: CreateFfcpeNodeWorkerOptions,
): (args: Record<string, unknown>) => Promise<WorkerInvokeResult> {
    const jobStore = options?.jobStore ?? createAioJobStore();
    const required = options?.requiredInputNames;
    const loggerName = options?.loggerName ?? "ffcpe-node-worker";

    return async (args) => {
        const logger = createAioLogger(loggerName, (args.LOG_LEVEL as string) ?? "info");
        const jobId = (args.jobId as string | undefined) ?? "";
        const inputs = (args.inputs ?? []) as FfcpeInput[];
        const authContext = args.authContext as Record<string, unknown> | undefined;
        const params = workflowParamsFromArgs(args);

        return runWorkerJob({
            jobStore,
            logger,
            execute: async (ctx) => {
                const missingMsg = validateRequiredInputs(required, ctx.inputs);
                if (missingMsg) {
                    throw new FfcpeJobFailedError(missingMsg);
                }

                const result = await handler({
                    jobId: ctx.jobId,
                    inputs: ctx.inputs,
                    params: ctx.params,
                    logger: ctx.logger,
                    authContext: ctx.authContext,
                    args: ctx.args,
                });

                if (result.status === "failed") {
                    throw new FfcpeJobFailedError(result.error ?? "Job failed");
                }

                return result.outputs ?? [];
            },
            payload: {
                jobId,
                inputs,
                params,
                authContext,
                args,
            },
        });
    };
}
