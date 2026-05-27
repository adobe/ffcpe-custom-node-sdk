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

import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockBackend, putCalls } = vi.hoisted(() => {
    const mockBackend = new Map<string, string>();
    const putCalls: { key: string; value: string; ttl?: number }[] = [];
    return { mockBackend, putCalls };
});

vi.mock("@adobe/aio-lib-state", () => ({
    default: {
        init: vi.fn(async () => ({
            async get(key: string) {
                const value = mockBackend.get(key);
                return value !== undefined ? { value } : undefined;
            },
            async put(key: string, value: string, opts?: { ttl?: number }) {
                putCalls.push({ key, value, ttl: opts?.ttl });
                mockBackend.set(key, value);
            },
        })),
    },
}));

import {
    createAioJobStore,
    DEFAULT_JOB_TTL_SECONDS,
    getJobActivationKey,
    getJobKey,
} from "../src/job/aio-job-store.js";

describe("aio-job-store key helpers", () => {
    it("getJobKey prefixes job id", () => {
        expect(getJobKey("abc-123")).toBe("ffcpe-job-abc-123");
    });

    it("getJobActivationKey uses activation suffix", () => {
        expect(getJobActivationKey("abc-123")).toBe("ffcpe-job-abc-123-activation");
    });

    it("DEFAULT_JOB_TTL_SECONDS is 24h", () => {
        expect(DEFAULT_JOB_TTL_SECONDS).toBe(86400);
    });
});

describe("createAioJobStore", () => {
    beforeEach(() => {
        mockBackend.clear();
        putCalls.length = 0;
    });

    it("create persists processing record and get returns it", async () => {
        const store = createAioJobStore();
        await store.create("job-1", { source: "test" });

        expect(putCalls[0]?.key).toBe(getJobKey("job-1"));
        expect(putCalls[0]?.ttl).toBe(DEFAULT_JOB_TTL_SECONDS);

        const job = await store.get("job-1");
        expect(job).not.toBeNull();
        expect(job?.jobId).toBe("job-1");
        expect(job?.status).toBe("processing");
        expect(job?.metadata).toEqual({ source: "test" });
        expect(job?.createdAt).toBeDefined();
        expect(job?.updatedAt).toBeDefined();
    });

    it("uses custom ttlSeconds when provided", async () => {
        const store = createAioJobStore({ ttlSeconds: 120 });
        await store.create("job-ttl", undefined);
        expect(putCalls[0]?.ttl).toBe(120);
    });

    it("get returns null for unknown job", async () => {
        const store = createAioJobStore();
        expect(await store.get("missing")).toBeNull();
    });

    it("complete merges outputs and sets completed status", async () => {
        const store = createAioJobStore();
        await store.create("job-2", {});

        await store.complete("job-2", [
            {
                port: "out",
                type: "text",
                name: "o.txt",
                mimeType: "text/plain",
                text: "done",
            },
        ]);

        const job = await store.get("job-2");
        expect(job?.status).toBe("completed");
        expect(job?.outputs?.[0]?.text).toBe("done");
        expect(job?.createdAt).toBeDefined();
        const completePut = putCalls.find((c) => c.value.includes('"completed"'));
        expect(completePut?.key).toBe(getJobKey("job-2"));
    });

    it("fail merges error and sets failed status", async () => {
        const store = createAioJobStore();
        await store.create("job-3", { x: 1 });

        await store.fail("job-3", "boom");

        const job = await store.get("job-3");
        expect(job?.status).toBe("failed");
        expect(job?.error).toBe("boom");
        expect(job?.metadata).toEqual({ x: 1 });
    });

    it("complete throws when job is missing", async () => {
        const store = createAioJobStore();
        await expect(
            store.complete("nope", [
                { port: "o", type: "text", name: "n", mimeType: "text/plain", text: "x" },
            ]),
        ).rejects.toThrow(/Job nope not found/);
    });

    it("fail throws when job is missing", async () => {
        const store = createAioJobStore();
        await expect(store.fail("nope", "err")).rejects.toThrow(/Job nope not found/);
    });

    it("setActivationMetadata and getActivationMetadata round-trip", async () => {
        const store = createAioJobStore();
        await store.setActivationMetadata?.("job-4", { activationId: "act-9", foo: true });

        expect(putCalls.some((c) => c.key === getJobActivationKey("job-4"))).toBe(true);

        const meta = await store.getActivationMetadata?.("job-4");
        expect(meta).toEqual({ activationId: "act-9", foo: true });
    });

    it("getActivationMetadata returns null when absent", async () => {
        const store = createAioJobStore();
        expect(await store.getActivationMetadata?.("no-meta")).toBeNull();
    });
});
