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

import type { JobStatus, Output } from "./contract.js";

/** Job row stored by the async submit/poll pattern. */
export interface JobRecord {
    jobId: string;
    status: JobStatus;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown>;
    outputs?: Output[];
    error?: string;
}

/**
 * Pluggable store for job lifecycle (implemented by consumers, e.g. aio-lib-state).
 */
export interface JobStore {
    create(jobId: string, metadata?: Record<string, unknown>): Promise<void>;
    get(jobId: string): Promise<JobRecord | null>;
    complete(jobId: string, outputs: Output[]): Promise<void>;
    fail(jobId: string, errorMessage: string): Promise<void>;
    setActivationMetadata?(jobId: string, metadata: Record<string, unknown>): Promise<void>;
    getActivationMetadata?(jobId: string): Promise<Record<string, unknown> | null>;
}
