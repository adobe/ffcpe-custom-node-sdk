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
import {
    createImageOutput,
    createJsonOutput,
    createTextOutput,
    createVideoOutput,
    detectMimeType,
} from "../../src/helpers/output-helpers.js";

describe("detectMimeType", () => {
    it.each([
        ["file.TXT", "text/plain"],
        ["notes.md", "text/plain"],
        ["data.JSON", "application/json"],
        ["x.PNG", "image/png"],
        ["x.jpg", "image/jpeg"],
        ["x.jpeg", "image/jpeg"],
        ["x.webp", "image/webp"],
        ["x.gif", "image/gif"],
        ["clip.mp4", "video/mp4"],
        ["clip.webm", "video/webm"],
    ])("%s → %s", (name, mime) => {
        expect(detectMimeType(name)).toBe(mime);
    });

    it("falls back to octet-stream for unknown extension", () => {
        expect(detectMimeType("blob.bin")).toBe("application/octet-stream");
    });
});

describe("create*Output", () => {
    const base = { port: "out", name: "artifact" };

    it("createTextOutput sets text and default mimeType", () => {
        const o = createTextOutput("hello", base);
        expect(o).toMatchObject({
            port: "out",
            name: "artifact",
            type: "text",
            mimeType: "text/plain",
            text: "hello",
        });
    });

    it("createTextOutput respects mimeType override", () => {
        const o = createTextOutput("x", { ...base, mimeType: "text/markdown" });
        expect(o.mimeType).toBe("text/markdown");
    });

    it("createImageOutput sets url and image mime default", () => {
        const o = createImageOutput("https://cdn/x.png", base);
        expect(o.type).toBe("image");
        expect(o.mimeType).toBe("image/png");
        expect(o.url).toBe("https://cdn/x.png");
    });

    it("createVideoOutput sets url and video mime default", () => {
        const o = createVideoOutput("https://cdn/v.mp4", base);
        expect(o.type).toBe("video");
        expect(o.mimeType).toBe("video/mp4");
        expect(o.url).toBe("https://cdn/v.mp4");
    });

    it("createJsonOutput sets json and json mime default", () => {
        const payload = { n: 42 };
        const o = createJsonOutput(payload, base);
        expect(o.type).toBe("json");
        expect(o.mimeType).toBe("application/json");
        expect(o.json).toEqual(payload);
    });
});
