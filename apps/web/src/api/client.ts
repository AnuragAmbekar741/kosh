import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

import type { AccessTokenResponse } from "@/api/auth/auth.types"

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean }

let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function apiDetail(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) {
    return undefined
  }
  const detail: unknown = error.response?.data?.detail
  return typeof detail === "string" ? detail : undefined
}

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined
    const url = config?.url ?? ""
    if (
      error.response?.status !== 401 ||
      config === undefined ||
      config._retried ||
      url.includes("/auth/refresh")
    ) {
      return Promise.reject(error)
    }
    config._retried = true
    try {
      const { data } = await client.post<AccessTokenResponse>("/auth/refresh")
      setAccessToken(data.access_token)
      config.headers.Authorization = `Bearer ${data.access_token}`
      return client.request(config)
    } catch {
      setAccessToken(null)
      return Promise.reject(error)
    }
  },
)