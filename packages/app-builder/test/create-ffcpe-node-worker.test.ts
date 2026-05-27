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

import { describe, expect, it } from "vitest";
import type { JobRecord, JobStore } from "@adobe/ffcpe-custom-node-core";
import { createTextOutput, findInputByPort } from "@adobe/ffcpe-custom-node-core";
import { createFfcpeNodeWorker } from "../src/actions/create-ffcpe-node-worker.js";

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

describe("createFfcpeNodeWorker", () => {
    it("runs handler and completes job", async () => {
        const jobStore = memoryJobStore();
        await jobStore.create("j1");
        const main = createFfcpeNodeWorker(
            async ({ inputs }) => {
                const prompt = findInputByPort(inputs, "prompt");
                const text = prompt?.type === "text" ? prompt.text : "";
                return {
                    status: "completed",
                    outputs: [
                        createTextOutput(`echo:${text}`, {
                            port: "out",
                            name: "o.txt",
                        }),
                    ],
                };
            },
            { jobStore, loggerName: "t", requiredInputNames: ["prompt"] },
        );

        const res = await main({
            jobId: "j1",
            inputs: [
                {
                    port: "prompt",
                    type: "text",
                    name: "prompt.txt",
                    mimeType: "text/plain",
                    text: "hi",
                },
            ],
            params: {},
            LOG_LEVEL: "error",
        });

        expect("error" in res).toBe(false);
        const job = await jobStore.get("j1");
        expect(job?.status).toBe("completed");
        expect(job?.outputs?.[0]?.text).toBe("echo:hi");
    });

    it("maps handler failed status to stored failure", async () => {
        const jobStore = memoryJobStore();
        await jobStore.create("j2");
        const main = createFfcpeNodeWorker(
            async () => ({
                status: "failed",
                error: "bad",
            }),
            { jobStore, loggerName: "t" },
        );

        const res = await main({
            jobId: "j2",
            inputs: [],
            params: {},
        });

        expect("error" in res).toBe(false);
        const job = await jobStore.get("j2");
        expect(job?.status).toBe("failed");
        expect(job?.error).toBe("bad");
    });

    it("fails when required inputs are missing", async () => {
        const jobStore = memoryJobStore();
        await jobStore.create("j3");
        const main = createFfcpeNodeWorker(async () => ({ status: "completed" }), {
            jobStore,
            loggerName: "t",
            requiredInputNames: ["prompt"],
        });

        const res = await main({ jobId: "j3", inputs: [], params: {} });

        expect("error" in res).toBe(false);
        const job = await jobStore.get("j3");
        expect(job?.status).toBe("failed");
        expect(job?.error).toContain("Missing required input: prompt");
    });

    it("defaults workflow params when args.params is not an object", async () => {
        const jobStore = memoryJobStore();
        await jobStore.create("j4");
        const main = createFfcpeNodeWorker(
            async ({ params }) => ({
                status: "completed",
                outputs: [
                    createTextOutput(JSON.stringify(params), { port: "out", name: "p.json" }),
                ],
            }),
            { jobStore, loggerName: "t" },
        );

        await main({ jobId: "j4", inputs: [], params: "ignored" });

        const job = await jobStore.get("j4");
        expect(job?.outputs?.[0]?.text).toBe("{}");
    });
});
