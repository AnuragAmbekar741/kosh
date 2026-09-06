import { useQuery } from "@tanstack/react-query"

import { getMe } from "@/api/users/users"
import type { UserPublic } from "@/api/users/users.types"
import { userQueryKeys } from "@/hooks/users/query-keys"

export function useGetMe() {
  return useQuery<UserPublic>({
    queryKey: userQueryKeys.me,
    queryFn: ({ signal }) => getMe(signal),
    retry: false,
  })
}
