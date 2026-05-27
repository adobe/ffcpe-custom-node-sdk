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

import type { Logger } from "../types/logger.js";

/** Simple logger implementation for tests or minimal hosts */
export function createConsoleLogger(prefix = "ffcpe"): Logger {
    const fmt = (args: unknown[]) =>
        args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    const p = (lvl: string, m: string) => {
        // oxlint-disable-next-line eslint/no-console -- intentional minimal logger
        console[lvl === "error" ? "error" : "log"](`[${prefix}] ${m}`);
    };
    return {
        info: (...args) => p("info", fmt(args)),
        warn: (...args) => p("warn", fmt(args)),
        error: (...args) => p("error", fmt(args)),
        debug: (...args) => p("debug", fmt(args)),
    };
}
