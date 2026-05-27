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
import type { SubmitJobRequest, FfcpeInput } from "../../src/types/contract.js";
import {
    findInputByName,
    findInputByPort,
    getImageInput,
    getJsonInput,
    getTextInput,
    getVideoInput,
} from "../../src/helpers/input-helpers.js";

function submit(...inputs: FfcpeInput[]): SubmitJobRequest {
    return { inputs, parameters: {} };
}

describe("findInputByName", () => {
    it("finds first matching name", () => {
        const inputs: FfcpeInput[] = [
            {
                port: "a",
                type: "text",
                name: "first",
                mimeType: "text/plain",
                text: "one",
            },
        ];
        const found = findInputByName(inputs, "first");
        expect(found?.type).toBe("text");
        if (found?.type === "text") expect(found.text).toBe("one");
    });

    it("returns first when duplicate names exist", () => {
        const inputs: FfcpeInput[] = [
            {
                port: "a",
                type: "text",
                name: "x",
                mimeType: "text/plain",
                text: "first",
            },
            {
                port: "b",
                type: "text",
                name: "x",
                mimeType: "text/plain",
                text: "second",
            },
        ];
        const found = findInputByName(inputs, "x");
        expect(found?.type).toBe("text");
        if (found?.type === "text") expect(found.text).toBe("first");
    });

    it("returns undefined when name missing", () => {
        expect(findInputByName([], "n")).toBeUndefined();
    });

    it("treats undefined inputs as empty", () => {
        expect(findInputByName(undefined, "n")).toBeUndefined();
    });
});

describe("findInputByPort", () => {
    it("finds by port", () => {
        const req = submit(
            {
                port: "in1",
                type: "text",
                name: "a",
                mimeType: "text/plain",
                text: "hi",
            },
            {
                port: "in2",
                type: "image",
                name: "b",
                mimeType: "image/png",
                url: "https://x.test/i.png",
            },
        );
        expect(findInputByPort(req.inputs, "in2")?.type).toBe("image");
    });

    it("returns undefined for unknown port", () => {
        expect(findInputByPort(submit().inputs, "nop")).toBeUndefined();
    });

    it("accepts worker ctx.inputs array", () => {
        const inputs: FfcpeInput[] = [
            {
                port: "in1",
                type: "image",
                name: "b",
                mimeType: "image/png",
                url: "https://x.test/i.png",
            },
        ];
        expect(findInputByPort(inputs, "in1")?.type).toBe("image");
    });

    it("treats undefined inputs as empty", () => {
        expect(findInputByPort(undefined, "x")).toBeUndefined();
    });
});

describe("getTextInput / getImageInput / getVideoInput", () => {
    const inputs = submit(
        {
            port: "t",
            type: "text",
            name: "t",
            mimeType: "text/plain",
            text: "body",
        },
        {
            port: "i",
            type: "image",
            name: "i",
            mimeType: "image/png",
            url: "https://img",
        },
        {
            port: "v",
            type: "video",
            name: "v",
            mimeType: "video/mp4",
            url: "https://vid",
        },
    ).inputs!;

    it("getTextInput returns text when port matches text entry", () => {
        expect(getTextInput(inputs, "t")).toBe("body");
    });

    it("getTextInput returns undefined when port is non-text", () => {
        expect(getTextInput(inputs, "i")).toBeUndefined();
    });

    it("getImageInput returns url for image port", () => {
        expect(getImageInput(inputs, "i")).toBe("https://img");
    });

    it("getVideoInput returns url for video port", () => {
        expect(getVideoInput(inputs, "v")).toBe("https://vid");
    });
});

describe("getJsonInput", () => {
    it("returns json field for json-typed port", () => {
        const inputs = submit({
            port: "data",
            type: "json",
            name: "j",
            mimeType: "application/json",
            json: { a: 1 },
        }).inputs!;
        expect(getJsonInput<{ a: number }>(inputs, "data")).toEqual({ a: 1 });
    });

    it("parses JSON from text entry when port matches", () => {
        const inputs = submit({
            port: "raw",
            type: "text",
            name: "t",
            mimeType: "application/json",
            text: '{"x":true}',
        }).inputs!;
        expect(getJsonInput<{ x: boolean }>(inputs, "raw")).toEqual({ x: true });
    });

    it("returns undefined when text is not valid JSON", () => {
        const inputs = submit({
            port: "bad",
            type: "text",
            name: "t",
            mimeType: "text/plain",
            text: "not-json",
        }).inputs!;
        expect(getJsonInput(inputs, "bad")).toBeUndefined();
    });

    it("returns undefined for wrong port or non-json non-parseable types", () => {
        const inputs = submit({
            port: "pic",
            type: "image",
            name: "n",
            mimeType: "image/png",
            url: "https://u",
        }).inputs!;
        expect(getJsonInput(inputs, "pic")).toBeUndefined();
        expect(getJsonInput(inputs, "missing")).toBeUndefined();
    });
});
