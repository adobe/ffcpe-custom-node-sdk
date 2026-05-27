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

/**
 * Catalog entry types for Workflow Builder `catalog-entry.json`.
 */

import type { PortType } from "./contract.js";

/** Alias of {@link PortType}; kept for catalog-entry readability. */
export type CatalogPortType = PortType;

export interface CatalogPort {
    name: string;
    type: CatalogPortType;
    required?: boolean;
    mimeTypes?: string[];
    description?: string;
    label?: string;
}

export interface CatalogAuthentication {
    type: "ims_service_token" | "none" | string;
}

export interface CatalogCustomActionConfig {
    submitEndpoint: string;
    statusEndpoint: string;
    pollIntervalMs?: number;
    maxPollAttempts?: number;
    timeoutMs?: number;
    authentication: CatalogAuthentication;
}

export interface CatalogUsage {
    commonPatterns?: string[];
    bestPractices?: string[];
}

export interface CatalogEntry {
    actionType: string;
    version: string;
    name: string;
    description?: string;
    category?: string;
    disabled?: boolean;
    workflowEnabled?: boolean;
    aliases?: string[];
    tags?: string[];
    inputs: CatalogPort[];
    outputs: CatalogPort[];
    parameters?: CatalogPort[];
    relatedActions?: string[];
    usage?: CatalogUsage;
    handlerType: "custom-action" | string;
    customActionConfig: CatalogCustomActionConfig;
}
