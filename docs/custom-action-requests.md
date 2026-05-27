# Custom action HTTP contract

**run-workflow** runs catalog actions with `handlerType: "custom-action"` by calling an external App Builder app: it **POST**s upstream inputs and workflow parameters to `submitEndpoint`, then **GET**s job status until the job finishes or times out. Configuration lives in `customActionConfig` (`packages/core/src/types/catalog.ts`); behavior is implemented in `CustomActionHandler`.

**Status URL:** `GET` uses `statusUrl` from the submit response when present; otherwise `statusEndpoint` + `?jobId=<jobId>`. Polling waits `pollIntervalMs` between attempts (default 3s), stops on `completed` or `failed`, retries `404`, and aborts after `maxPollAttempts` or `timeoutMs`. On `failed`, the handler throws using the response `error` field.

---

## 1. POST — submit job

| | |
| --- | --- |
| **URL** | `submitEndpoint` (full URL from catalog) |
| **Method** | `POST` |
| **Headers** | `Content-Type: application/json`; plus optional `customActionConfig.headers`; if `authentication.type === "ims_service_token"`: `x-api-key: run-workflow-service`, `Authorization` (IMS service token) |
| **Body** | `{ "inputs": input[], "parameters": object }` |

**`inputs[]`:** each item has `port`, `type` (`image` \| `text` \| `video` \| `json`), `name`, `mimeType`, and for `image`/`video` a `url`, for `text` a `text`, for `json` a `json` value.

**`parameters`:** workflow action parameters (or `{}`).

**Success (2xx JSON):** at minimum `jobId`, `status`; **`statusUrl`** optional — full URL for polling when returned.

---

## 2. GET — job status

| | |
| --- | --- |
| **URL** | Resolved status URL (see above) |
| **Method** | `GET` |
| **Headers** | Same auth/header rules as POST (`buildHeaders` adds `Content-Type: application/json` here too) |
| **Body** | none |

**Success (2xx JSON):** `jobId`, `status` — use `processing` while running; **`completed`** or **`failed`** end polling. Include **`outputs`** (same contract shape as submit `inputs`, field name `outputs`) when completed. Include **`error`** when failed.

---

## OpenAPI 3

Actual paths are the configured full URLs (`submitEndpoint`, resolved status URL). This document bundles both operations for reference.

```yaml
openapi: 3.0.3
info:
  title: Custom action (run-workflow → App Builder)
  version: 1.0.0
paths:
  /submit:
    post:
      summary: Submit async job
      description: URL is customActionConfig.submitEndpoint
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/SubmitJobRequest"
      responses:
        "200":
          description: Job accepted
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SubmitJobResponse"
  /status:
    get:
      summary: Poll job status
      description: URL is submit response statusUrl, or statusEndpoint?jobId=
      responses:
        "200":
          description: Job state
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/JobStatusResponse"
components:
  schemas:
    SubmitJobRequest:
      type: object
      required: [inputs, parameters]
      properties:
        inputs:
          type: array
          items:
            $ref: "#/components/schemas/input"
        parameters:
          type: object
          additionalProperties: true
    input:
      type: object
      required: [port, type, name, mimeType]
      properties:
        port: { type: string }
        type:
          type: string
          enum: [image, text, video, json]
        name: { type: string }
        mimeType: { type: string }
        url: { type: string }
        text: { type: string }
        json: {}
    SubmitJobResponse:
      type: object
      required: [jobId, status]
      properties:
        jobId: { type: string }
        status: { type: string }
        statusUrl:
          type: string
          description: Full GET URL for polling; optional when catalog fallback applies
    JobStatusResponse:
      type: object
      required: [jobId, status]
      properties:
        jobId: { type: string }
        status:
          type: string
          enum: [processing, completed, failed]
        outputs:
          type: array
          items:
            $ref: "#/components/schemas/Output"
        error: { type: string }
    Output:
      type: object
      required: [port, type, name, mimeType]
      properties:
        port: { type: string }
        type:
          type: string
          enum: [image, text, video, json]
        name: { type: string }
        mimeType: { type: string }
        url: { type: string }
        text: { type: string }
        json: {}
```
