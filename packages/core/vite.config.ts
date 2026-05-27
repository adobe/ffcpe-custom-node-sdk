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

import { defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";
import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

/** Keep Node built-ins out of the bundle (Node-only library, not browser). */
const nodeBuiltins = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

export default defineConfig(({ command }) => ({
    root,
    resolve: command === "build" ? { conditions: ["node", "import", "module", "default"] } : {},
    test: {
        globals: true,
        environment: "node",
        include: ["test/**/*.test.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
        },
        pool: "forks",
    },
    build: {
        target: "node22",
        lib: {
            entry: resolve(root, "src/index.ts"),
            name: "FfcpeCustomNodeSdk",
            fileName: (format) => (format === "es" ? "index.mjs" : "index.cjs"),
            formats: ["es", "cjs"],
        },
        rollupOptions: {
            external: ["@adobe/aio-lib-ims", ...nodeBuiltins],
            output: {
                exports: "named",
                preserveModules: false,
            },
        },
        sourcemap: true,
        minify: false,
        emptyOutDir: true,
        outDir: resolve(root, "dist"),
    },
    plugins: [
        dts({
            tsconfigPath: resolve(root, "tsconfig.build.json"),
            rollupTypes: true,
            outDir: resolve(root, "dist/types"),
        }),
    ],
}));
