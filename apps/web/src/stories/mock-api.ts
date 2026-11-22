import type { AxiosAdapter, AxiosResponse } from "axios"

import { client } from "@/api/client"
import {
  analytics,
  billLines,
  catalog,
  documentDetail,
  documentSummary,
  inbox,
  spendSummary,
} from "@/stories/fixtures"

// Storybook never calls the real API: the shared axios client gets this
// adapter, which answers from fixtures.ts. Stories can override a route with
// `parameters.mockApi`, e.g. `{ "GET /spend-items/summary": { ... } }`.

export type MockRoutes = Record<string, unknown>

const DELAY_MS = 250

function defaultRoutes(): MockRoutes {
  return {
    "GET /documents": inbox,
    "GET /documents/doc-1": documentDetail,
    "PATCH /documents/doc-1": documentSummary,
    "POST /documents/doc-1/confirm": billLines,
    "DELETE /documents/doc-1": null,
    "GET /spend-items": { data: billLines, total: billLines.length },
    "GET /spend-items/summary": spendSummary,
    "GET /spend-items/analytics": analytics,
    "GET /catalog/search": catalog,
  }
}

function match(routes: MockRoutes, method: string, url: string) {
  const key = `${method} ${url}`
  if (key in routes) return { found: true, data: routes[key] }
  // PATCH/PUT/DELETE on any single line echo a line back.
  if (/^(PATCH|PUT) \/spend-items\/[^/]+(\/item)?$/.test(key)) {
    return { found: true, data: billLines[0] }
  }
  if (/^DELETE \/spend-items\/[^/]+$/.test(key)) {
    return { found: true, data: null }
  }
  return { found: false, data: undefined }
}

export function installMockApi(overrides: MockRoutes = {}) {
  const routes = { ...defaultRoutes(), ...overrides }
  const adapter: AxiosAdapter = async (config) => {
    const method = (config.method ?? "get").toUpperCase()
    const url = (config.url ?? "").split("?")[0]
    const { found, data } = match(routes, method, url)
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
    const response: AxiosResponse = {
      data: found ? data : { detail: `No story mock for ${method} ${url}` },
      status: found ? 200 : 404,
      statusText: found ? "OK" : "Not Found",
      headers: {},
      config,
    }
    if (!found) {
      return Promise.reject(
        Object.assign(new Error(response.data.detail), {
          isAxiosError: true,
          response,
          config,
        })
      )
    }
    return response
  }
  client.defaults.adapter = adapter
}
