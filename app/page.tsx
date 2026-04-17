"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const res = await fetch("/api/auth/get-session", {
        credentials: "include",
      });
      const session = await res.json();
      if (cancelled) return;

      if (session !== null && session?.user) {
        router.replace("/dashboard");
      } else {
        router.replace("/sign-in");
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div
        className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary"
        aria-label="Loading"
        role="status"
      />
    </div>
  );
}
