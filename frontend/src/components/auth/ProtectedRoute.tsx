import { Show, SignInButton } from "@clerk/react";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
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
