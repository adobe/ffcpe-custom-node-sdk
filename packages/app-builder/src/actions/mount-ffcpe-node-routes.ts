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

import type { Context, Hono } from "hono";
import type {
    InboundAuth,
    JobOrchestrator,
    JobStore,
    SubmitJobRequest,
} from "@adobe/ffcpe-custom-node-core";
import {
    createImsInboundAuth,
    handleFfcpeStatus,
    handleFfcpeSubmit,
} from "@adobe/ffcpe-custom-node-core";
import { createAioLogger } from "../logging/aio-logger.js";
import { createOpenwhiskJobOrchestrator } from "../job/openwhisk-job-orchestrator.js";
import { buildStatusUrl } from "../status-url.js";
import { createAioJobStore } from "../job/aio-job-store.js";

function getLogLevel(c: Context): string {
    const env = c.env as { params?: Record<string, unknown> } | undefined;
    return (env?.params?.LOG_LEVEL as string) ?? "info";
}

export interface MountFfcpeNodeRoutesOptions {
    worker: { package: string; name: string };
    web: { package: string; name: string };
    jobStore?: JobStore;
    /** Override the default OpenWhisk orchestrator (e.g. for tests or a different invoke transport). */
    orchestrator?: JobOrchestrator;
    routes?: { submit?: string; status?: string };
    /**
     * {@link InboundAuth} for submit and status. Omit for default IMS bearer + `x-api-key`. Pass `null` to disable.
     */
    authenticate?: InboundAuth | null;
    loggerName?: string;
    jobMetadata?: (submit: SubmitJobRequest) => Record<string, unknown> | undefined;
}

function workerFullName(worker: { package: string; name: string }): string {
    return `${worker.package}/${worker.name}`;
}

/**
 * Registers FFCPE `POST /submit` and `GET /status` on a Hono app (WinterTC `Request`/`Response`).
 */
export function mountFfcpeNodeRoutes(app: Hono, options: MountFfcpeNodeRoutesOptions): void {
    const submitPath = options.routes?.submit ?? "/submit";
    const statusPath = options.routes?.status ?? "/status";

    const { web } = options;
    if (!web.package?.trim() || !web.name?.trim()) {
        throw new Error(
            "mountFfcpeNodeRoutes: `web.package` and `web.name` must be non-empty strings (used for status URLs).",
        );
    }

    const jobStore = options.jobStore ?? createAioJobStore();
    const authenticate =
        options.authenticate === null
            ? undefined
            : (options.authenticate ?? createImsInboundAuth());

    const orchestrator =
        options.orchestrator ??
        createOpenwhiskJobOrchestrator({
            workerActionName: workerFullName(options.worker),
            jobStore,
        });

    app.post(submitPath, async (c) => {
        const logger = createAioLogger(options.loggerName ?? "ffcpe-custom-node", getLogLevel(c));

        return handleFfcpeSubmit(c.req.raw, {
            jobStore,
            orchestrator,
            logger,
            buildStatusUrl: (jobId) =>
                buildStatusUrl(jobId, {
                    packageName: web.package,
                    actionName: web.name,
                    statusPath,
                }),
            authenticate,
            jobMetadata: options.jobMetadata,
        });
    });

    app.get(statusPath, async (c) => {
        const logger = createAioLogger(
            options.loggerName ?? "ffcpe-custom-node-status",
            getLogLevel(c),
        );
        return handleFfcpeStatus(c.req.raw, {
            jobStore,
            logger,
            authenticate,
        });
    });
}
