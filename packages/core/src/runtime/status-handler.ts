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

import type { JobStatusResponse } from "../types/contract.js";
import type { InboundAuth, InboundAuthResult } from "../types/inbound-auth.js";
import type { JobStore } from "../types/job-store.js";
import type { Logger } from "../types/logger.js";
import { jsonResponse } from "../helpers/request-helpers.js";

export interface FfcpeStatusOptions {
    jobStore: JobStore;
    logger: Logger;
    /** Optional auth gate; when omitted the handler accepts every request. */
    authenticate?: InboundAuth;
}

/**
 * `GET /status?jobId=…` — authorize, load the job, and return the FFCPE status body.
 */
export async function handleFfcpeStatus(
    request: Request,
    options: FfcpeStatusOptions,
): Promise<Response> {
    const { jobStore, logger, authenticate } = options;
    try {
        let authResult: InboundAuthResult = { ok: true, authContext: {} };
        if (authenticate) {
            authResult = await authenticate(request, { logger, route: "status" });
            if (!authResult.ok) return authResult.response;
        }

        if (request.method !== "GET") {
            return jsonResponse(405, { error: "Method not allowed" });
        }

        const url = new URL(request.url);
        const jobId = url.searchParams.get("jobId");
        if (!jobId) {
            return jsonResponse(400, { error: "Missing required query parameter: jobId" });
        }

        const job = await jobStore.get(jobId);
        if (!job) {
            return jsonResponse(404, { error: `Job not found: ${jobId}` });
        }

        const activation = jobStore.getActivationMetadata
            ? await jobStore.getActivationMetadata(jobId)
            : null;
        const mergedMetadata = {
            ...job.metadata,
            ...activation,
        };

        const responseBody: JobStatusResponse = {
            jobId: job.jobId,
            status: job.status,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
        };
        if (Object.keys(mergedMetadata).length > 0) {
            responseBody.metadata = mergedMetadata;
        }
        if (job.status === "completed" && job.outputs) {
            responseBody.outputs = job.outputs;
        }
        if (job.status === "failed" && job.error) {
            responseBody.error = job.error;
        }

        const httpStatus =
            job.status === "completed" ? 200 : job.status === "processing" ? 202 : 500;
        return jsonResponse(httpStatus, responseBody);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Status handler failed: ${message}`);
        return jsonResponse(500, { error: "Failed to check job status" });
    }
}
