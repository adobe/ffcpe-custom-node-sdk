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
 * Adobe I/O State implementation of {@link import("@adobe/ffcpe-custom-node-core").JobStore}.
 */

import aioLib from "@adobe/aio-lib-state";
import type { JobRecord, JobStatus, JobStore } from "@adobe/ffcpe-custom-node-core";

const JOB_KEY_PREFIX = "ffcpe-job-";
const JOB_ACTIVATION_SUFFIX = "-activation";

export const DEFAULT_JOB_TTL_SECONDS = 86400; // 24 hours

export function getJobKey(jobId: string): string {
    return `${JOB_KEY_PREFIX}${jobId}`;
}

export function getJobActivationKey(jobId: string): string {
    return `${JOB_KEY_PREFIX}${jobId}${JOB_ACTIVATION_SUFFIX}`;
}

export interface AioJobStoreOptions {
    ttlSeconds?: number;
}

export function createAioJobStore(options: AioJobStoreOptions = {}): JobStore {
    const ttl = options.ttlSeconds ?? DEFAULT_JOB_TTL_SECONDS;
    let statePromise: Promise<aioLib.AdobeState> | undefined;
    async function getState() {
        if (!statePromise) {
            statePromise = aioLib.init();
        }
        return statePromise;
    }

    return {
        async create(jobId, metadata) {
            const state = await getState();
            const now = new Date().toISOString();
            const record: JobRecord = {
                jobId,
                status: "processing",
                createdAt: now,
                updatedAt: now,
                metadata,
            };
            await state.put(getJobKey(jobId), JSON.stringify(record), { ttl });
        },

        async get(jobId) {
            const state = await getState();
            const result = await state.get(getJobKey(jobId));
            if (!result?.value) return null;
            return JSON.parse(result.value as string) as JobRecord;
        },

        async complete(jobId, outputs) {
            const state = await getState();
            const existingRes = await state.get(getJobKey(jobId));
            if (!existingRes?.value) {
                throw new Error(`Job ${jobId} not found`);
            }
            const existing = JSON.parse(existingRes.value as string) as JobRecord;
            const record: JobRecord = {
                ...existing,
                status: "completed",
                updatedAt: new Date().toISOString(),
                outputs,
            };
            await state.put(getJobKey(jobId), JSON.stringify(record), { ttl });
        },

        async fail(jobId, errorMessage) {
            const state = await getState();
            const existingRes = await state.get(getJobKey(jobId));
            if (!existingRes?.value) {
                throw new Error(`Job ${jobId} not found`);
            }
            const existing = JSON.parse(existingRes.value as string) as JobRecord;
            const record: JobRecord = {
                ...existing,
                status: "failed" as JobStatus,
                updatedAt: new Date().toISOString(),
                error: errorMessage,
            };
            await state.put(getJobKey(jobId), JSON.stringify(record), { ttl });
        },

        async setActivationMetadata(jobId, metadata) {
            const state = await getState();
            await state.put(getJobActivationKey(jobId), JSON.stringify(metadata), { ttl });
        },

        async getActivationMetadata(jobId) {
            const state = await getState();
            const result = await state.get(getJobActivationKey(jobId));
            if (!result?.value) return null;
            return JSON.parse(result.value as string) as Record<string, unknown>;
        },
    };
}
