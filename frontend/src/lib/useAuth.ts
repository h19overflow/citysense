import { useAuth as useClerkAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";

interface AuthMe {
  user_id: string;
  email: string | null;
  name: string | null;
  is_admin: boolean;
}

async function fetchMe(getToken: () => Promise<string | null>): Promise<AuthMe> {
  const token = await getToken();
  const response = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user profile");
  }

  return response.json();
}

export function useAuthMe() {
  const { getToken, isSignedIn } = useClerkAuth();

  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => fetchMe(getToken),
    enabled: !!isSignedIn,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
