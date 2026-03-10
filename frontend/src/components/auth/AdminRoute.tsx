import { Show, SignInButton } from "@clerk/react";
import type { ReactNode } from "react";
import { useAuthMe } from "@/lib/useAuth";

function AdminGate({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useAuthMe();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground text-sm">
        Checking access…
      </div>
    );
  }

  if (isError || !data?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-4">
        <h2 className="text-2xl font-bold text-foreground">Access denied</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          This page is restricted to administrators.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <>
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
      <Show when="signed-in">
        <AdminGate>{children}</AdminGate>
      </Show>
    </>
  );
}
