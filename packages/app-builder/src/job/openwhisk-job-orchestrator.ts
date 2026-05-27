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

import openwhisk from "openwhisk";
import type { JobOrchestrator, JobStore } from "@adobe/ffcpe-custom-node-core";

export interface OpenwhiskJobOrchestratorOptions {
    /** Full action name, e.g. `dx-excshell-1/my-worker` */
    workerActionName: string;
    /** {@link JobStore} used to record activation metadata after async invoke. */
    jobStore: JobStore;
}

export function createOpenwhiskJobOrchestrator(
    options: OpenwhiskJobOrchestratorOptions,
): JobOrchestrator {
    return {
        async invoke({ jobId, inputs, params, authContext }) {
            const ow = openwhisk();
            const invokeResponse = await ow.actions.invoke({
                name: options.workerActionName,
                blocking: false,
                result: false,
                params: {
                    jobId,
                    inputs,
                    params,
                    authContext,
                },
            });
            const { activationId } = invokeResponse as { activationId: string };
            if (options.jobStore.setActivationMetadata) {
                await options.jobStore.setActivationMetadata(jobId, { activationId });
            }
        },
    };
}
