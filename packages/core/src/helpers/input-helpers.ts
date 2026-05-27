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

import type { FfcpeInput } from "../types/contract.js";

export function findInputByName(
    inputs: FfcpeInput[] | undefined,
    name: string,
): FfcpeInput | undefined {
    return (inputs ?? []).find((entry) => entry.name === name);
}

export function findInputByPort(
    inputs: FfcpeInput[] | undefined,
    port: string,
): FfcpeInput | undefined {
    return (inputs ?? []).find((entry) => entry.port === port);
}

export function getTextInput(inputs: FfcpeInput[] | undefined, port: string): string | undefined {
    const ent = findInputByPort(inputs, port);
    return ent?.type === "text" ? ent.text : undefined;
}

export function getImageInput(inputs: FfcpeInput[] | undefined, port: string): string | undefined {
    const ent = findInputByPort(inputs, port);
    return ent?.type === "image" ? ent.url : undefined;
}

export function getVideoInput(inputs: FfcpeInput[] | undefined, port: string): string | undefined {
    const ent = findInputByPort(inputs, port);
    return ent?.type === "video" ? ent.url : undefined;
}

export function getJsonInput<T = unknown>(
    inputs: FfcpeInput[] | undefined,
    port: string,
): T | undefined {
    const entry = findInputByPort(inputs, port);
    if (!entry) return undefined;
    if (entry.type === "json") {
        return entry.json as T;
    }
    if (entry.type === "text") {
        try {
            return JSON.parse(entry.text) as T;
        } catch {
            return undefined;
        }
    }
    return undefined;
}
