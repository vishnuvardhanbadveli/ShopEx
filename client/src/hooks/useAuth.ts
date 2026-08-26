import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
};

export function useAuth(options: UseAuthOptions = {}) {
  const [, navigate] = useLocation();

  const meQuery = trpc.auth.me.useQuery();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await meQuery.refetch();
    },
  });

  useEffect(() => {
    if (
      options.redirectOnUnauthenticated &&
      !meQuery.isLoading &&
      !meQuery.data
    ) {
      navigate("/");
    }
  }, [
    options.redirectOnUnauthenticated,
    meQuery.isLoading,
    meQuery.data,
    navigate,
  ]);

  return {
    user: meQuery.data ?? null,
    loading: meQuery.isLoading,
    error: meQuery.error,
    isAuthenticated: !!meQuery.data,
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
    refetch: meQuery.refetch,
  };
}