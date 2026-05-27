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

import { Ims } from "@adobe/aio-lib-ims";

export interface TokenValidationResult {
    valid: boolean;
    clientId?: string;
    orgId?: string;
    userId?: string;
    reason?: string;
}

interface LibImsValidation {
    valid?: boolean;
    reason?: string;
    token?: {
        client_id?: string;
        org?: string;
        user_id?: string;
    };
}

/**
 * Validates a user access token against IMS (expects `x-api-key` header value as IMS client id).
 */
export async function validateAccessToken(
    bearerToken: string,
    expectedClientId: string,
): Promise<TokenValidationResult> {
    try {
        const { ims } = await Ims.fromToken(bearerToken);
        const data = (await ims.validateToken(bearerToken, expectedClientId)) as LibImsValidation;

        if (!data?.valid) {
            return { valid: false, reason: data?.reason ?? "unknown" };
        }

        const tokenClientId = data.token?.client_id;
        if (tokenClientId !== undefined && tokenClientId !== expectedClientId) {
            return {
                valid: false,
                reason: "client_id mismatch",
            };
        }

        return {
            valid: true,
            clientId: tokenClientId ?? expectedClientId,
            orgId: data.token?.org,
            userId: data.token?.user_id,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { valid: false, reason: message };
    }
}
