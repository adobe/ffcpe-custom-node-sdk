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

/**
 * @adobe/ffcpe-custom-node-app-builder — Hono + OpenWhisk + Adobe I/O integration.
 */

// Web action — mount FFCPE submit/status routes on a Hono app
export { mountFfcpeNodeRoutes } from "./actions/mount-ffcpe-node-routes.js";
export type { MountFfcpeNodeRoutesOptions } from "./actions/mount-ffcpe-node-routes.js";

// Worker action — turn a FFCPE handler into a `main(args)` for OpenWhisk
export { createFfcpeNodeWorker } from "./actions/create-ffcpe-node-worker.js";
export type { CreateFfcpeNodeWorkerOptions } from "./actions/create-ffcpe-node-worker.js";

// Job store — Adobe I/O State implementation of `JobStore`
export {
    createAioJobStore,
    DEFAULT_JOB_TTL_SECONDS,
    getJobKey,
    getJobActivationKey,
} from "./job/aio-job-store.js";
export type { AioJobStoreOptions } from "./job/aio-job-store.js";

// Orchestrator — OpenWhisk async invoke
export { createOpenwhiskJobOrchestrator } from "./job/openwhisk-job-orchestrator.js";
export type { OpenwhiskJobOrchestratorOptions } from "./job/openwhisk-job-orchestrator.js";

// Status URL — build a poll URL for a raw-http web action
export { buildStatusUrl } from "./status-url.js";
export type { StatusUrlOptions } from "./status-url.js";

// Logger — Adobe I/O implementation of `Logger`
export { createAioLogger } from "./logging/aio-logger.js";
