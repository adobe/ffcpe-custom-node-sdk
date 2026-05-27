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

import type { Logger } from "./logger.js";

export interface InboundAuthContext {
    logger: Logger;
    route: "submit" | "status";
    /** Auth state from a previous step; ignored unless your composition forwards it. */
    authContext?: Record<string, unknown>;
}

export interface InboundAuthOk {
    ok: true;
    authContext?: Record<string, unknown>;
}

export interface InboundAuthDenied {
    ok: false;
    response: Response;
}

export type InboundAuthResult = InboundAuthOk | InboundAuthDenied;

/**
 * Runs before submit/status handlers. Return `ok: false` + Response to short-circuit.
 */
export type InboundAuth = (
    request: Request,
    context: InboundAuthContext,
) => Promise<InboundAuthResult>;
