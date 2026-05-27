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

const { aio, createLogger } = vi.hoisted(() => {
    const aio = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    };
    const createLogger = vi.fn(() => aio);
    return { aio, createLogger };
});

vi.mock("@adobe/aio-lib-core-logging", () => ({
    default: createLogger,
}));

import { createAioLogger } from "../src/logging/aio-logger.js";

describe("createAioLogger", () => {
    it("forwards normalized messages to aio-lib-core-logging", () => {
        const logger = createAioLogger("my-action", "debug");
        logger.info("hello", { a: 1 });
        logger.warn(42);
        logger.error("fail");
        logger.debug("trace");

        expect(aio.info).toHaveBeenCalledWith("hello", { a: 1 });
        expect(aio.warn).toHaveBeenCalledWith("42");
        expect(aio.error).toHaveBeenCalledWith("fail");
        expect(aio.debug).toHaveBeenCalledWith("trace");
    });

    it("defaults log level when omitted", () => {
        createLogger.mockClear();
        createAioLogger("other-action", undefined);
        expect(createLogger).toHaveBeenCalledWith("other-action", { level: "info" });
    });
});
