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

import { afterEach, describe, expect, it, vi } from "vitest";
import { createConsoleLogger } from "../../src/logging/console-logger.js";

describe("createConsoleLogger", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("logs all levels with prefix", () => {
        const log = vi.spyOn(console, "log").mockImplementation(() => {});
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const logger = createConsoleLogger("pfx");

        logger.info("hello", { x: 1 });
        logger.warn("careful");
        logger.debug("trace");
        logger.error("fail");

        expect(log).toHaveBeenCalledWith('[pfx] hello {"x":1}');
        expect(log).toHaveBeenCalledWith("[pfx] careful");
        expect(log).toHaveBeenCalledWith("[pfx] trace");
        expect(error).toHaveBeenCalledWith("[pfx] fail");
    });
});
