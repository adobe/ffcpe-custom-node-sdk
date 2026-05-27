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
import type { Logger } from "../../src/types/logger.js";
import { createImsInboundAuth } from "../../src/auth/ims-inbound-auth.js";

function mockLogger(): Logger {
    return {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    };
}

function requestWithHeaders(headers: Record<string, string>): Request {
    return new Request("https://example.test/api", { headers });
}

describe("createImsInboundAuth", () => {
    it("denies when Authorization is missing", async () => {
        const validateToken = vi.fn();
        const auth = createImsInboundAuth({ validateToken });
        const res = await auth(requestWithHeaders({ "x-api-key": "client-id" }), {
            logger: mockLogger(),
            route: "submit",
        });

        expect(res.ok).toBe(false);
        if (!res.ok) {
            expect(res.response.status).toBe(401);
            const body = (await res.response.json()) as { error: string };
            expect(body.error).toContain("Authorization");
        }
        expect(validateToken).not.toHaveBeenCalled();
    });

    it("denies when x-api-key is missing", async () => {
        const validateToken = vi.fn();
        const auth = createImsInboundAuth({ validateToken });
        const res = await auth(requestWithHeaders({ Authorization: "Bearer token-value" }), {
            logger: mockLogger(),
            route: "submit",
        });

        expect(res.ok).toBe(false);
        if (!res.ok) {
            expect(res.response.status).toBe(401);
            const body = (await res.response.json()) as { error: string };
            expect(body.error).toContain("x-api-key");
        }
        expect(validateToken).not.toHaveBeenCalled();
    });

    it("denies listing both headers when both missing", async () => {
        const auth = createImsInboundAuth({ validateToken: vi.fn() });
        const res = await auth(requestWithHeaders({}), {
            logger: mockLogger(),
            route: "status",
        });

        expect(res.ok).toBe(false);
        if (!res.ok) {
            const body = (await res.response.json()) as { error: string };
            expect(body.error).toContain("Authorization");
            expect(body.error).toContain("x-api-key");
        }
    });

    it("denies when validateToken reports invalid", async () => {
        const validateToken = vi.fn().mockResolvedValue({
            valid: false,
            reason: "token expired",
        });
        const logger = mockLogger();
        const auth = createImsInboundAuth({ validateToken });

        const res = await auth(
            requestWithHeaders({
                Authorization: "Bearer good-format",
                "x-api-key": "ims-client",
            }),
            { logger, route: "submit" },
        );

        expect(validateToken).toHaveBeenCalledWith("good-format", "ims-client");
        expect(res.ok).toBe(false);
        if (!res.ok) {
            expect(res.response.status).toBe(401);
            const body = (await res.response.json()) as { error: string };
            expect(body.error).toContain("token expired");
        }
        expect(vi.mocked(logger.error)).toHaveBeenCalled();
    });

    it("allows when validateToken reports valid", async () => {
        const validateToken = vi.fn().mockResolvedValue({
            valid: true,
            clientId: "ims-client",
            orgId: "org@AdobeOrg",
            userId: "user@AdobeID",
        });
        const logger = mockLogger();
        const auth = createImsInboundAuth({ validateToken });

        const res = await auth(
            requestWithHeaders({
                Authorization: "Bearer secret-token",
                "x-api-key": "ims-client",
            }),
            { logger, route: "submit" },
        );

        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.authContext).toEqual({
                orgId: "org@AdobeOrg",
                userId: "user@AdobeID",
                clientId: "ims-client",
            });
        }
        expect(vi.mocked(logger.info)).toHaveBeenCalled();
    });

    it("treats Bearer-only whitespace as missing token", async () => {
        const validateToken = vi.fn();
        const auth = createImsInboundAuth({ validateToken });
        const res = await auth(
            requestWithHeaders({
                Authorization: "Bearer   ",
                "x-api-key": "k",
            }),
            { logger: mockLogger(), route: "submit" },
        );

        expect(res.ok).toBe(false);
        expect(validateToken).not.toHaveBeenCalled();
    });
});
