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

import { getBearerToken, getHeader, jsonResponse } from "../helpers/request-helpers.js";
import type { InboundAuth } from "../types/inbound-auth.js";
import { validateAccessToken as imsValidateAccessToken } from "./ims-validate-token.js";

export interface ImsInboundAuthOptions {
    /** Override IMS token validation (defaults to {@link imsValidateAccessToken}). */
    validateToken?: typeof imsValidateAccessToken;
}

/**
 * Inbound auth: requires `Authorization: Bearer …` and `x-api-key` (IMS client id), validates the bearer against IMS.
 */
export function createImsInboundAuth(options: ImsInboundAuthOptions = {}): InboundAuth {
    const validate = options.validateToken ?? imsValidateAccessToken;
    return async (request, { logger }) => {
        const hasBearer = Boolean(getBearerToken(request));
        logger.info(`Authorization header: ${hasBearer ? "present" : "missing"}`);

        const bearerToken = getBearerToken(request);
        const apiKey = getHeader(request, "x-api-key");

        if (!bearerToken || !apiKey) {
            const missing = [!bearerToken && "Authorization", !apiKey && "x-api-key"]
                .filter(Boolean)
                .join(", ");
            return {
                ok: false,
                response: jsonResponse(401, { error: `Missing required header(s): ${missing}` }),
            };
        }

        const tokenResult = await validate(bearerToken, apiKey);
        if (!tokenResult.valid) {
            logger.error(`Token validation failed: ${tokenResult.reason}`);
            return {
                ok: false,
                response: jsonResponse(401, { error: `Unauthorized: ${tokenResult.reason}` }),
            };
        }

        logger.info(`Token validated — org: ${tokenResult.orgId}, user: ${tokenResult.userId}`);
        return {
            ok: true,
            authContext: {
                orgId: tokenResult.orgId,
                userId: tokenResult.userId,
                clientId: tokenResult.clientId,
            },
        };
    };
}
