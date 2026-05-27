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
 * @adobe/ffcpe-custom-node-core — WinterTC core for FFCPE (Firefly Creative Production for Enterprise) custom actions.
 *
 * Public surface is grouped below by role. Internal plumbing (handler dep
 * structs, runtime façades) lives in `src/runtime/*` and is not re-exported.
 */

// Contract
export type {
    PortType,
    FfcpeInput,
    TextInput,
    ImageInput,
    VideoInput,
    JsonInput,
    Output,
    SubmitJobRequest,
    SubmitJobResponse,
    JobStatusResponse,
    JobStatus,
} from "./types/contract.js";

// Catalog
export type {
    CatalogPortType,
    CatalogPort,
    CatalogAuthentication,
    CatalogCustomActionConfig,
    CatalogUsage,
    CatalogEntry,
} from "./types/catalog.js";

// Helpers — request
export { getBearerToken, getHeader, jsonResponse } from "./helpers/request-helpers.js";

// Helpers — inputs
export {
    findInputByName,
    findInputByPort,
    getTextInput,
    getImageInput,
    getVideoInput,
    getJsonInput,
} from "./helpers/input-helpers.js";

// Helpers — outputs
export type { OutputOptions } from "./helpers/output-helpers.js";
export {
    detectMimeType,
    createTextOutput,
    createImageOutput,
    createVideoOutput,
    createJsonOutput,
} from "./helpers/output-helpers.js";

// Auth
export type {
    InboundAuth,
    InboundAuthContext,
    InboundAuthResult,
    InboundAuthOk,
    InboundAuthDenied,
} from "./types/inbound-auth.js";
export { createImsInboundAuth } from "./auth/ims-inbound-auth.js";
export type { ImsInboundAuthOptions } from "./auth/ims-inbound-auth.js";
export { validateAccessToken } from "./auth/ims-validate-token.js";
export type { TokenValidationResult } from "./auth/ims-validate-token.js";

// Jobs — persistence + orchestration
export type { JobRecord, JobStore } from "./types/job-store.js";
export type { JobOrchestrator, JobOrchestratorInvokePayload } from "./types/job-orchestrator.js";
export { jobOrchestratorFromFn } from "./runtime/job-orchestrator.js";

// Logging
export type { Logger } from "./types/logger.js";
export { createConsoleLogger } from "./logging/console-logger.js";

// Runtime — HTTP handlers
export { handleFfcpeSubmit } from "./runtime/submit-handler.js";
export type { FfcpeSubmitOptions } from "./runtime/submit-handler.js";
export { handleFfcpeStatus } from "./runtime/status-handler.js";
export type { FfcpeStatusOptions } from "./runtime/status-handler.js";

// Runtime — worker
export { runWorkerJob } from "./runtime/worker-runner.js";
export type {
    RunWorkerJobOptions,
    WorkerPayload,
    WorkerInvokeResult,
    WorkerInvokeSuccess,
    WorkerInvokeError,
} from "./runtime/worker-runner.js";
export type {
    FfcpeNodeWorkerHandler,
    FfcpeNodeWorkerContext,
    FfcpeNodeWorkerResult,
} from "./runtime/worker-handler.js";
export { FfcpeJobFailedError } from "./runtime/job-failed-error.js";
