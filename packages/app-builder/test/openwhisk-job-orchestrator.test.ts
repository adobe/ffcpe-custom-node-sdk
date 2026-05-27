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
import type { JobStore } from "@adobe/ffcpe-custom-node-core";

const invoke = vi.fn();

vi.mock("openwhisk", () => ({
    default: () => ({
        actions: { invoke },
    }),
}));

import { createOpenwhiskJobOrchestrator } from "../src/job/openwhisk-job-orchestrator.js";

describe("createOpenwhiskJobOrchestrator", () => {
    it("invokes worker and stores activation metadata", async () => {
        invoke.mockResolvedValue({ activationId: "act-99" });
        const setActivationMetadata = vi.fn(async () => {});
        const jobStore = { setActivationMetadata } as unknown as JobStore;
        const orchestrator = createOpenwhiskJobOrchestrator({
            workerActionName: "pkg/worker",
            jobStore,
        });

        await orchestrator.invoke({
            jobId: "j1",
            inputs: [],
            params: { p: 1 },
            authContext: { token: "t" },
        });

        expect(invoke).toHaveBeenCalledWith({
            name: "pkg/worker",
            blocking: false,
            result: false,
            params: {
                jobId: "j1",
                inputs: [],
                params: { p: 1 },
                authContext: { token: "t" },
            },
        });
        expect(setActivationMetadata).toHaveBeenCalledWith("j1", { activationId: "act-99" });
    });

    it("skips activation metadata when job store has no hook", async () => {
        invoke.mockResolvedValue({ activationId: "act-1" });
        const orchestrator = createOpenwhiskJobOrchestrator({
            workerActionName: "pkg/worker",
            jobStore: {} as JobStore,
        });
        await orchestrator.invoke({ jobId: "j2", inputs: [], params: {} });
        expect(invoke).toHaveBeenCalled();
    });
});
