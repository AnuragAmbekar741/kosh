import type { UserPublic } from "@/api/users/users.types"

export type AccessTokenResponse = {
  access_token: string
  token_type: string
  user: UserPublic
}

export type RegisterRequest = {
  name: string
  email: string
  password: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type GoogleAuthRequest = {
  id_token: string
}
