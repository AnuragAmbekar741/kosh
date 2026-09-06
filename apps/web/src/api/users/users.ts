import { client } from "@/api/client"
import type { UserPublic } from "@/api/users/users.types"

export function getMe(signal?: AbortSignal): Promise<UserPublic> {
  return client.get<UserPublic>("/users/me", { signal }).then((res) => res.data)
}
