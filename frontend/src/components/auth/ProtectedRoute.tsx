import { Show, SignInButton, useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

interface ProfileApiResponse {
  exists: boolean;
}

async function fetchProfileExists(token: string | null): Promise<ProfileApiResponse> {
  const response = await fetch("/api/citizen/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to check profile");
  return response.json();
}

function ProfileGuard({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const location = useLocation();

  const { data, isLoading } = useQuery<ProfileApiResponse>({
    queryKey: ["citizen", "profile"],
    queryFn: async () => fetchProfileExists(await getToken()),
    enabled: !!isSignedIn,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    staleTime: 5 * 60 * 1000,
  });

  const isOnProfilePage = location.pathname === "/app/profile";

  if (isLoading) return null;

  if (data?.exists === false && !isOnProfilePage) {
    return <Navigate to="/app/profile" replace />;
  }

  return <>{children}</>;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <ProfileGuard>{children}</ProfileGuard>
      </Show>
      <Show when="signed-out">
        <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-4">
          <h2 className="text-2xl font-bold text-foreground">Sign in required</h2>
          <p className="text-muted-foreground text-sm max-w-md">
            You need to sign in to access this page.
          </p>
          <SignInButton mode="modal">
            <button className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors">
              Sign In
            </button>
          </SignInButton>
        </div>
      </Show>
    </>
  );
}
