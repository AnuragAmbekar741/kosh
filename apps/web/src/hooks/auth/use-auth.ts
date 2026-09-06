import { useMutation, useQueryClient } from "@tanstack/react-query"

import { google, login, logout, register } from "@/api/auth/auth"
import { userQueryKeys } from "@/hooks/users/query-keys"

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      queryClient.setQueryData(userQueryKeys.me, data.user)
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      queryClient.setQueryData(userQueryKeys.me, data.user)
    },
  })
}

export function useGoogleAuth() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: google,
    onSuccess: (data) => {
      queryClient.setQueryData(userQueryKeys.me, data.user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.removeQueries({ queryKey: userQueryKeys.me })
    },
  })
}
