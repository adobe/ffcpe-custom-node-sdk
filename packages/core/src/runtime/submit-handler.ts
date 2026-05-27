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

import type { SubmitJobRequest, SubmitJobResponse } from "../types/contract.js";
import type { InboundAuth, InboundAuthResult } from "../types/inbound-auth.js";
import type { JobOrchestrator } from "../types/job-orchestrator.js";
import type { JobStore } from "../types/job-store.js";
import type { Logger } from "../types/logger.js";
import { jsonResponse } from "../helpers/request-helpers.js";

export interface FfcpeSubmitOptions {
    jobStore: JobStore;
    orchestrator: JobOrchestrator;
    logger: Logger;
    /** Build a full status URL clients can poll for the given `jobId`. */
    buildStatusUrl: (jobId: string) => string;
    /** Optional auth gate; when omitted the handler accepts every request. */
    authenticate?: InboundAuth;
    /** Optional builder for `JobRecord.metadata` from the submit body. */
    jobMetadata?: (submit: SubmitJobRequest) => Record<string, unknown> | undefined;
}

function randomJobId(): string {
    return globalThis.crypto.randomUUID();
}

async function readJsonBody(request: Request): Promise<unknown> {
    try {
        return await request.json();
    } catch {
        return undefined;
    }
}

/**
 * `POST /submit` — authorize, persist the initial job record, then invoke the worker via {@link JobOrchestrator}.
 */
export async function handleFfcpeSubmit(
    request: Request,
    options: FfcpeSubmitOptions,
): Promise<Response> {
    const { jobStore, orchestrator, logger, buildStatusUrl, authenticate, jobMetadata } = options;
    try {
        let authResult: InboundAuthResult = { ok: true, authContext: undefined };
        if (authenticate) {
            authResult = await authenticate(request, { logger, route: "submit" });
            if (!authResult.ok) return authResult.response;
        }

        if (request.method !== "POST") {
            return jsonResponse(405, { error: "Method not allowed" });
        }

        const raw = await readJsonBody(request);
        if (raw === undefined) {
            return jsonResponse(400, { error: "Invalid JSON body" });
        }
        const submitBody = raw as SubmitJobRequest;
        const metadata = jobMetadata?.(submitBody);
        const jobId = randomJobId();
        logger.info(`Creating job ${jobId}`);
        await jobStore.create(jobId, metadata);

        const authContext = authResult.ok ? authResult.authContext : undefined;

        await orchestrator.invoke({
            jobId,
            inputs: submitBody.inputs ?? [],
            params: submitBody.parameters ?? {},
            authContext,
        });

        const body: SubmitJobResponse = {
            jobId,
            status: "processing",
            statusUrl: buildStatusUrl(jobId),
        };
        return jsonResponse(202, body);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Submit handler failed: ${message}`);
        return jsonResponse(500, { error: "Failed to start processing" });
    }
}
