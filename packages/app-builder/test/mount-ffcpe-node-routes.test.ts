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

import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import {
    jobOrchestratorFromFn,
    type JobRecord,
    type JobStatusResponse,
    type JobStore,
} from "@adobe/ffcpe-custom-node-core";

const invoke = vi.fn();

vi.mock("openwhisk", () => ({
    default: () => ({
        actions: { invoke },
    }),
}));

import { mountFfcpeNodeRoutes } from "../src/actions/mount-ffcpe-node-routes.js";

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

describe("mountFfcpeNodeRoutes", () => {
    it("registers submit and status routes", async () => {
        const jobStore = memoryJobStore();
        const invoke = vi.fn(async () => {});
        const app = new Hono();
        mountFfcpeNodeRoutes(app, {
            worker: { package: "pkg", name: "worker" },
            web: { package: "pkg", name: "web" },
            jobStore,
            orchestrator: jobOrchestratorFromFn(invoke),
            authenticate: null,
            routes: { submit: "/go", status: "/check" },
        });

        const submit = await app.request("http://localhost/go", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: [], parameters: {} }),
        });
        expect(submit.status).toBe(202);
        const { jobId, statusUrl } = (await submit.json()) as {
            jobId: string;
            statusUrl: string;
        };
        expect(invoke).toHaveBeenCalledOnce();
        expect(statusUrl).toContain("/check?jobId=");

        await jobStore.complete(jobId, [
            {
                port: "o",
                type: "text",
                name: "n",
                mimeType: "text/plain",
                text: "done",
            },
        ]);
        const status = await app.request(`http://localhost/check?jobId=${jobId}`);
        expect(status.status).toBe(200);
        const statusBody = (await status.json()) as JobStatusResponse;
        expect(statusBody.outputs?.[0]?.text).toBe("done");
    });

    it("requires web package and action names", () => {
        const app = new Hono();
        expect(() =>
            mountFfcpeNodeRoutes(app, {
                worker: { package: "pkg", name: "worker" },
                web: { package: " ", name: "web" },
            }),
        ).toThrow(/web\.package/);
    });

    it("uses default orchestrator and custom log level", async () => {
        invoke.mockResolvedValue({ activationId: "act-1" });
        const jobStore = memoryJobStore();
        const app = new Hono();
        mountFfcpeNodeRoutes(app, {
            worker: { package: "pkg", name: "worker" },
            web: { package: "pkg", name: "web" },
            jobStore,
            authenticate: null,
        });

        const res = await app.request(
            "http://localhost/submit",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inputs: [], parameters: {} }),
            },
            { params: { LOG_LEVEL: "debug" } },
        );
        expect(res.status).toBe(202);
        expect(invoke).toHaveBeenCalledWith(
            expect.objectContaining({ name: "pkg/worker", blocking: false }),
        );
    });
});
