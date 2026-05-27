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
import { getBearerToken, getHeader, jsonResponse } from "../../src/helpers/request-helpers.js";

function req(headers: Record<string, string>): Request {
    return new Request("https://example.test/r", { headers });
}

describe("getHeader", () => {
    it("reads canonical header name", () => {
        expect(getHeader(req({ "Content-Type": "application/json" }), "Content-Type")).toBe(
            "application/json",
        );
    });

    it("falls back to lowercase name", () => {
        expect(getHeader(req({ "x-api-key": "abc" }), "X-Api-Key")).toBe("abc");
    });

    it("returns undefined when absent", () => {
        expect(getHeader(req({}), "Missing")).toBeUndefined();
    });
});

describe("getBearerToken", () => {
    it("extracts token after Bearer prefix", () => {
        expect(getBearerToken(req({ Authorization: "Bearer my.token.value" }))).toBe(
            "my.token.value",
        );
    });

    it("trims surrounding whitespace on token", () => {
        expect(getBearerToken(req({ Authorization: "Bearer   spaced   " }))).toBe("spaced");
    });

    it("returns undefined without Bearer prefix", () => {
        expect(getBearerToken(req({ Authorization: "Basic xxx" }))).toBeUndefined();
    });

    it("returns undefined when Authorization missing", () => {
        expect(getBearerToken(req({}))).toBeUndefined();
    });

    it("returns undefined when Bearer has no token", () => {
        expect(getBearerToken(req({ Authorization: "Bearer" }))).toBeUndefined();
    });
});

describe("jsonResponse", () => {
    it("serializes body and sets status", async () => {
        const res = jsonResponse(418, { tea: "earl grey" });
        expect(res.status).toBe(418);
        expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
        expect(await res.json()).toEqual({ tea: "earl grey" });
    });
});
