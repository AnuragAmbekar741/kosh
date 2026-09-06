import type {
  AccessTokenResponse,
  GoogleAuthRequest,
  LoginRequest,
  RegisterRequest,
} from "@/api/auth/auth.types"
import { client, setAccessToken } from "@/api/client"

export async function register(
  body: RegisterRequest,
): Promise<AccessTokenResponse> {
  const { data } = await client.post<AccessTokenResponse>(
    "/auth/register",
    body,
  )
  setAccessToken(data.access_token)
  return data
}

export async function login(body: LoginRequest): Promise<AccessTokenResponse> {
  const { data } = await client.post<AccessTokenResponse>("/auth/login", body)
  setAccessToken(data.access_token)
  return data
}

export async function google(
  body: GoogleAuthRequest,
): Promise<AccessTokenResponse> {
  const { data } = await client.post<AccessTokenResponse>("/auth/google", body)
  setAccessToken(data.access_token)
  return data
}

export async function logout(): Promise<void> {
  try {
    await client.post("/auth/logout")
  } finally {
    setAccessToken(null)
  }
}
