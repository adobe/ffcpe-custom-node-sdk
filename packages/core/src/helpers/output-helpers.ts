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

import type { Output, PortType } from "../types/contract.js";

export interface OutputOptions {
    port: string;
    name: string;
    mimeType?: string;
}

const MIME_DEFAULTS: Record<PortType, string> = {
    text: "text/plain",
    image: "image/png",
    video: "video/mp4",
    json: "application/json",
};

/** Guess MIME type from filename extension (fallback `application/octet-stream`). */
export function detectMimeType(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".txt") || lower.endsWith(".md")) return "text/plain";
    if (lower.endsWith(".json")) return "application/json";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".gif")) return "image/gif";
    if (lower.endsWith(".mp4")) return "video/mp4";
    if (lower.endsWith(".webm")) return "video/webm";
    return "application/octet-stream";
}

const createOutput = (type: PortType, options: OutputOptions): Output => {
    return {
        type,
        ...options,
        mimeType: options.mimeType ?? MIME_DEFAULTS[type],
    };
};

export function createTextOutput(text: string, options: OutputOptions): Output {
    return {
        ...createOutput("text", options),
        text,
    };
}

export function createImageOutput(url: string, options: OutputOptions): Output {
    return {
        ...createOutput("image", options),
        url,
    };
}

export function createVideoOutput(url: string, options: OutputOptions): Output {
    return {
        ...createOutput("video", options),
        url,
    };
}

export function createJsonOutput(json: unknown, options: OutputOptions): Output {
    return {
        ...createOutput("json", options),
        json,
    };
}
