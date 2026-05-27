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

vi.mock("@adobe/aio-lib-ims", () => ({
    Ims: {
        fromToken: vi.fn(),
    },
}));

import { Ims } from "@adobe/aio-lib-ims";
import { validateAccessToken } from "../../src/auth/ims-validate-token.js";

describe("validateAccessToken", () => {
    beforeEach(() => {
        vi.mocked(Ims.fromToken).mockReset();
    });

    it("returns invalid with IMS reason when validateToken reports invalid", async () => {
        vi.mocked(Ims.fromToken).mockResolvedValue({
            token: "t",
            ims: {
                validateToken: vi.fn().mockResolvedValue({ valid: false, reason: "bad token" }),
            },
        });

        const r = await validateAccessToken("jwt-here", "my-client");
        expect(r).toEqual({ valid: false, reason: "bad token" });
    });

    it("uses unknown reason when valid is false but reason omitted", async () => {
        vi.mocked(Ims.fromToken).mockResolvedValue({
            token: "t",
            ims: {
                validateToken: vi.fn().mockResolvedValue({ valid: false }),
            },
        });

        const r = await validateAccessToken("jwt", "c");
        expect(r.valid).toBe(false);
        expect(r.reason).toBe("unknown");
    });

    it("returns invalid when token client_id differs from expected", async () => {
        vi.mocked(Ims.fromToken).mockResolvedValue({
            token: "t",
            ims: {
                validateToken: vi.fn().mockResolvedValue({
                    valid: true,
                    token: { client_id: "other-client", org: "o", user_id: "u" },
                }),
            },
        });

        const r = await validateAccessToken("jwt", "expected-client");
        expect(r.valid).toBe(false);
        expect(r.reason).toBe("client_id mismatch");
    });

    it("returns valid with IMS token claims when client_id matches", async () => {
        vi.mocked(Ims.fromToken).mockResolvedValue({
            token: "t",
            ims: {
                validateToken: vi.fn().mockResolvedValue({
                    valid: true,
                    token: {
                        client_id: "expected-client",
                        org: "@org/123",
                        user_id: "user@example.com",
                    },
                }),
            },
        });

        const r = await validateAccessToken("jwt", "expected-client");
        expect(r).toEqual({
            valid: true,
            clientId: "expected-client",
            orgId: "@org/123",
            userId: "user@example.com",
        });
    });

    it("falls back clientId to expectedClientId when token omits client_id", async () => {
        vi.mocked(Ims.fromToken).mockResolvedValue({
            token: "t",
            ims: {
                validateToken: vi.fn().mockResolvedValue({
                    valid: true,
                    token: { org: "o-only" },
                }),
            },
        });

        const r = await validateAccessToken("jwt", "fallback-client");
        expect(r.valid).toBe(true);
        expect(r.clientId).toBe("fallback-client");
        expect(r.orgId).toBe("o-only");
    });

    it("maps fromToken rejection to invalid result", async () => {
        vi.mocked(Ims.fromToken).mockRejectedValue(new Error("cannot resolve env"));

        const r = await validateAccessToken("jwt", "c");
        expect(r.valid).toBe(false);
        expect(r.reason).toBe("cannot resolve env");
    });

    it("maps validateToken rejection to invalid result", async () => {
        vi.mocked(Ims.fromToken).mockResolvedValue({
            token: "t",
            ims: {
                validateToken: vi.fn().mockRejectedValue(new Error("IMS unreachable")),
            },
        });

        const r = await validateAccessToken("jwt", "c");
        expect(r.valid).toBe(false);
        expect(r.reason).toBe("IMS unreachable");
    });
});
