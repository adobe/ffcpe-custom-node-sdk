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

import { describe, expect, it, vi } from "vitest";
import {
    createConsoleLogger,
    handleFfcpeStatus,
    handleFfcpeSubmit,
    jobOrchestratorFromFn,
    runWorkerJob,
    FfcpeJobFailedError,
    type JobRecord,
    type JobStore,
} from "../src/index.js";

function memoryJobStore(): JobStore {
    const map = new Map<string, JobRecord>();
    return {
        async create(jobId, metadata) {
            const now = new Date().toISOString();
            map.set(jobId, {
                jobId,
                status: "processing",
                createdAt: now,
                updatedAt: now,
                metadata,
            });
        },
        async get(jobId) {
            return map.get(jobId) ?? null;
        },
        async complete(jobId, outputs) {
            const cur = map.get(jobId);
            if (!cur) throw new Error("missing");
            map.set(jobId, {
                ...cur,
                status: "completed",
                updatedAt: new Date().toISOString(),
                outputs,
            });
        },
        async fail(jobId, errorMessage) {
            const cur = map.get(jobId);
            if (!cur) throw new Error("missing");
            map.set(jobId, {
                ...cur,
                status: "failed",
                updatedAt: new Date().toISOString(),
                error: errorMessage,
            });
        },
    };
}

describe("handleFfcpeSubmit", () => {
    it("returns 202 and invokes orchestrator", async () => {
        const jobStore = memoryJobStore();
        const invoke = vi.fn(async () => {});
        const orchestrator = jobOrchestratorFromFn(invoke);
        const logger = createConsoleLogger("test");

        const submitBody = {
            inputs: [
                {
                    port: "p",
                    type: "text",
                    name: "n",
                    mimeType: "text/plain",
                    text: "hi",
                },
            ],
            parameters: {},
        };

        const req = new Request("https://example.test/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(submitBody),
        });

        const res = await handleFfcpeSubmit(req, {
            jobStore,
            orchestrator,
            logger,
            buildStatusUrl: (id) => `https://example.test/status?jobId=${id}`,
        });
        expect(res.status).toBe(202);
        const json = (await res.json()) as { jobId: string; statusUrl: string };
        expect(json.jobId).toBeDefined();
        expect(json.statusUrl).toContain("jobId=");
        expect(invoke).toHaveBeenCalledOnce();
        expect(invoke.mock.calls[0]).toEqual([
            {
                authContext: undefined,
                jobId: json.jobId,
                inputs: submitBody.inputs,
                params: submitBody.parameters,
            },
        ]);
    });
});

describe("handleFfcpeStatus", () => {
    it("returns 404 when missing", async () => {
        const jobStore = memoryJobStore();
        const logger = createConsoleLogger("test");
        const res = await handleFfcpeStatus(
            new Request("https://example.test/status?jobId=missing"),
            { jobStore, logger },
        );
        expect(res.status).toBe(404);
    });
});

describe("runWorkerJob", () => {
    it("completes job and persists outputs", async () => {
        const jobStore = memoryJobStore();
        const logger = createConsoleLogger("test");
        await jobStore.create("j1");
        const inv = await runWorkerJob({
            jobStore,
            logger,
            execute: async () => [
                {
                    port: "o",
                    type: "text",
                    name: "out",
                    mimeType: "text/plain",
                    text: "ok",
                },
            ],
            payload: {
                jobId: "j1",
                inputs: [],
                authContext: undefined,
                params: {},
                args: {
                    jobId: "j1",
                    inputs: [],
                    params: {},
                },
            },
        });
        expect("error" in inv).toBe(false);
        const job = await jobStore.get("j1");
        expect(job?.status).toBe("completed");
        expect(job?.outputs?.[0]?.text).toBe("ok");
    });

    it("FfcpeJobFailedError marks job failed with OW 200 body", async () => {
        const jobStore = memoryJobStore();
        const logger = createConsoleLogger("test");
        await jobStore.create("j2");
        const inv = await runWorkerJob({
            jobStore,
            logger,
            execute: async () => {
                throw new FfcpeJobFailedError("nope");
            },
            payload: {
                jobId: "j2",
                inputs: [],
                authContext: undefined,
                params: {},
                args: {
                    jobId: "j2",
                    inputs: [],
                    params: {},
                },
            },
        });
        if ("error" in inv) {
            expect.fail("expected OW success envelope");
        }
        expect(inv.body.status).toBe("failed");
        const job = await jobStore.get("j2");
        expect(job?.status).toBe("failed");
        expect(job?.error).toBe("nope");
    });
});
