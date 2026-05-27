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
 * FFCPE (Firefly Creative Production for Enterprise) custom-action HTTP contract types
 * (aligned with docs/custom-action-requests.md and Adobe Workflow Builder submit/status semantics).
 */

/** Supported port payload kinds */
export type PortType = "image" | "text" | "video" | "json";

/** Text payload input */
export interface TextInput {
    port: string;
    type: "text";
    name: string;
    mimeType: string;
    text: string;
}

/** Image payload input (URL to asset) */
export interface ImageInput {
    port: string;
    type: "image";
    name: string;
    mimeType: string;
    url: string;
}

/** Video payload input (URL to asset) */
export interface VideoInput {
    port: string;
    type: "video";
    name: string;
    mimeType: string;
    url: string;
}

/** JSON payload input */
export interface JsonInput {
    port: string;
    type: "json";
    name: string;
    mimeType: string;
    json: unknown;
}

/** Single input item from FFCPE submit body (discriminated by `type`) */
export type FfcpeInput = TextInput | ImageInput | VideoInput | JsonInput;

/** Output item shape (same fields as inputs; field name in responses is `outputs`) */
export interface Output {
    port: string;
    type: PortType;
    name: string;
    mimeType: string;
    url?: string;
    text?: string;
    json?: unknown;
}

/** POST body from FFCPE */
export interface SubmitJobRequest {
    inputs: FfcpeInput[];
    parameters: Record<string, unknown>;
}

/** Submit success body */
export interface SubmitJobResponse {
    jobId: string;
    status: "processing";
    statusUrl?: string;
}

/** Job status values exposed to FFCPE */
export type JobStatus = "processing" | "completed" | "failed";

/** GET status success body */
export interface JobStatusResponse {
    jobId: string;
    status: JobStatus;
    outputs?: Output[];
    error?: string;
    createdAt?: string;
    updatedAt?: string;
    metadata?: Record<string, unknown>;
}
