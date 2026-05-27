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

export interface StatusUrlOptions {
    packageName: string;
    /** OpenWhisk web action name (first segment of path after package) */
    actionName: string;
    /** Path registered on the Hono app for status, default `/status` */
    statusPath?: string;
}

/**
 * Default FFCPE status URL for a raw HTTP web action using Hono routes under one action.
 */
export function buildStatusUrl(jobId: string, options: StatusUrlOptions): string {
    const apiHost = (process.env.__OW_API_HOST ?? "https://adobeioruntime.net").replace(/\/+$/, "");
    const namespace = process.env.__OW_NAMESPACE ?? "unknown";
    const statusSeg = (options.statusPath ?? "/status").replace(/^\//, "");
    return `${apiHost}/api/v1/web/${namespace}/${options.packageName}/${options.actionName}/${statusSeg}?jobId=${encodeURIComponent(jobId)}`;
}
