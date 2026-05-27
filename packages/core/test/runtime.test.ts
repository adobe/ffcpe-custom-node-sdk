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
    type JobStatusResponse,
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

function mockLogger() {
    return {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    };
}

describe("jobOrchestratorFromFn", () => {
    it("forwards invoke payload", async () => {
        const invoke = vi.fn(async () => {});
        const orchestrator = jobOrchestratorFromFn(invoke);
        const payload = {
            jobId: "j",
            inputs: [],
            params: {},
            authContext: { token: "t" },
        };
        await orchestrator.invoke(payload);
        expect(invoke).toHaveBeenCalledWith(payload);
    });
});

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

    it("rejects bad method, JSON, auth, and orchestrator errors", async () => {
        const jobStore = memoryJobStore();
        const logger = mockLogger();
        const base = {
            jobStore,
            orchestrator: jobOrchestratorFromFn(vi.fn(async () => {})),
            logger,
            buildStatusUrl: (id: string) => `https://example.test/status?jobId=${id}`,
        };

        expect(
            (await handleFfcpeSubmit(new Request("https://example.test/submit"), base)).status,
        ).toBe(405);
        expect(
            (
                await handleFfcpeSubmit(
                    new Request("https://example.test/submit", {
                        method: "POST",
                        body: "{",
                    }),
                    base,
                )
            ).status,
        ).toBe(400);

        const deny = vi.fn(async () => ({
            ok: false as const,
            response: new Response(null, { status: 401 }),
        }));
        expect(
            (
                await handleFfcpeSubmit(
                    new Request("https://example.test/submit", { method: "POST", body: "{}" }),
                    { ...base, authenticate: deny },
                )
            ).status,
        ).toBe(401);

        const boom = jobOrchestratorFromFn(
            vi.fn(async () => {
                throw new Error("invoke failed");
            }),
        );
        expect(
            (
                await handleFfcpeSubmit(
                    new Request("https://example.test/submit", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ inputs: [], parameters: {} }),
                    }),
                    { ...base, orchestrator: boom },
                )
            ).status,
        ).toBe(500);
        expect(logger.error).toHaveBeenCalled();
    });

    it("passes auth context and custom metadata", async () => {
        const jobStore = memoryJobStore();
        const invoke = vi.fn(async () => {});
        const authContext = { userId: "u1" };
        const authenticate = vi.fn(async () => ({
            ok: true as const,
            authContext,
        }));
        const res = await handleFfcpeSubmit(
            new Request("https://example.test/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inputs: [], parameters: { x: 1 } }),
            }),
            {
                jobStore,
                orchestrator: jobOrchestratorFromFn(invoke),
                logger: mockLogger(),
                buildStatusUrl: (id) => `https://example.test/status?jobId=${id}`,
                authenticate,
                jobMetadata: () => ({ source: "test" }),
            },
        );
        expect(res.status).toBe(202);
        const { jobId } = (await res.json()) as { jobId: string };
        const job = await jobStore.get(jobId);
        expect(job?.metadata).toEqual({ source: "test" });
        expect(invoke).toHaveBeenCalledWith({
            jobId,
            inputs: [],
            params: { x: 1 },
            authContext,
        });
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

    it("returns status bodies for each job state", async () => {
        const jobStore = memoryJobStore();
        const logger = mockLogger();
        const opts = { jobStore, logger };

        expect(
            (await handleFfcpeStatus(new Request("https://example.test/status"), opts)).status,
        ).toBe(400);
        expect(
            (
                await handleFfcpeStatus(
                    new Request("https://example.test/status?jobId=x", { method: "POST" }),
                    opts,
                )
            ).status,
        ).toBe(405);

        await jobStore.create("done", { tag: "a" });
        await jobStore.complete("done", [
            {
                port: "o",
                type: "text",
                name: "n",
                mimeType: "text/plain",
                text: "ok",
            },
        ]);
        const completed = await handleFfcpeStatus(
            new Request("https://example.test/status?jobId=done"),
            opts,
        );
        expect(completed.status).toBe(200);
        const completedBody = (await completed.json()) as JobStatusResponse;
        expect(completedBody.outputs?.[0]?.text).toBe("ok");

        await jobStore.create("pending");
        expect(
            (
                await handleFfcpeStatus(
                    new Request("https://example.test/status?jobId=pending"),
                    opts,
                )
            ).status,
        ).toBe(202);

        await jobStore.create("bad");
        await jobStore.fail("bad", "nope");
        const failed = await handleFfcpeStatus(
            new Request("https://example.test/status?jobId=bad"),
            opts,
        );
        expect(failed.status).toBe(500);
        const failedBody = (await failed.json()) as JobStatusResponse;
        expect(failedBody.error).toBe("nope");
    });

    it("merges activation metadata and honors auth", async () => {
        const jobStore = memoryJobStore();
        jobStore.getActivationMetadata = vi.fn(async () => ({ activationId: "act-1" }));
        await jobStore.create("j", { foo: 1 });
        const deny = vi.fn(async () => ({
            ok: false as const,
            response: new Response(null, { status: 403 }),
        }));
        expect(
            (
                await handleFfcpeStatus(new Request("https://example.test/status?jobId=j"), {
                    jobStore,
                    logger: mockLogger(),
                    authenticate: deny,
                })
            ).status,
        ).toBe(403);

        const res = await handleFfcpeStatus(new Request("https://example.test/status?jobId=j"), {
            jobStore,
            logger: mockLogger(),
        });
        const statusBody = (await res.json()) as JobStatusResponse;
        expect(statusBody.metadata).toEqual({ foo: 1, activationId: "act-1" });
    });

    it("returns 500 when jobStore throws", async () => {
        const jobStore = {
            get: vi.fn(async () => {
                throw new Error("db down");
            }),
            create: vi.fn(),
            complete: vi.fn(),
            fail: vi.fn(),
        } satisfies JobStore;
        const logger = mockLogger();
        const res = await handleFfcpeStatus(new Request("https://example.test/status?jobId=x"), {
            jobStore,
            logger,
        });
        expect(res.status).toBe(500);
        expect(logger.error).toHaveBeenCalled();
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

    it("returns 400 without jobId and 500 on unexpected errors", async () => {
        const jobStore = memoryJobStore();
        const logger = mockLogger();
        const base = {
            jobStore,
            logger,
            payload: {
                jobId: "",
                inputs: [],
                authContext: undefined,
                params: {},
                args: {},
            },
        };

        const missing = await runWorkerJob({
            ...base,
            execute: async () => [],
        });
        expect("error" in missing && missing.error.statusCode).toBe(400);

        await jobStore.create("j3");
        const failed = await runWorkerJob({
            ...base,
            execute: async () => {
                throw new Error("boom");
            },
            payload: { ...base.payload, jobId: "j3", args: { jobId: "j3" } },
        });
        expect("error" in failed && failed.error.statusCode).toBe(500);

        const brokenStore = memoryJobStore();
        await brokenStore.create("j4");
        brokenStore.fail = vi.fn(async () => {
            throw new Error("state unavailable");
        });
        await runWorkerJob({
            jobStore: brokenStore,
            logger,
            execute: async () => {
                throw new Error("handler boom");
            },
            payload: { ...base.payload, jobId: "j4", args: { jobId: "j4" } },
        });
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining("Failed to update job state"),
        );
    });
});
