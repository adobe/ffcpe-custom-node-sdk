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

import { afterEach, describe, expect, it } from "vitest";
import { buildStatusUrl } from "../src/status-url.js";

describe("buildStatusUrl", () => {
    const env = process.env;

    afterEach(() => {
        process.env = env;
    });

    it("builds OpenWhisk web action URL with encoded jobId", () => {
        process.env = {
            ...env,
            __OW_API_HOST: "https://runtime.test///",
            __OW_NAMESPACE: "ns-1",
        };
        const url = buildStatusUrl("job/id", {
            packageName: "my-pkg",
            actionName: "my-web",
            statusPath: "/status",
        });
        expect(url).toBe(
            "https://runtime.test/api/v1/web/ns-1/my-pkg/my-web/status?jobId=job%2Fid",
        );
    });

    it("falls back to default host and namespace", () => {
        delete process.env.__OW_API_HOST;
        delete process.env.__OW_NAMESPACE;
        const url = buildStatusUrl("j1", { packageName: "p", actionName: "a" });
        expect(url).toBe("https://adobeioruntime.net/api/v1/web/unknown/p/a/status?jobId=j1");
    });
});
