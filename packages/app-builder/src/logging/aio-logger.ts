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

import createLogger from "@adobe/aio-lib-core-logging";
import type { Logger } from "@adobe/ffcpe-custom-node-core";

function normalize(args: unknown[]): (string | object)[] {
    return args.map((a) => (typeof a === "object" && a !== null ? a : String(a)));
}

export function createAioLogger(name: string, level: string | undefined): Logger {
    const aio = createLogger(name, { level: level ?? "info" });
    return {
        info: (...args) => aio.info(...normalize(args)),
        warn: (...args) => aio.warn(...normalize(args)),
        error: (...args) => aio.error(...normalize(args)),
        debug: (...args) => aio.debug(...normalize(args)),
    };
}
