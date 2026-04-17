"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ClassItem = {
  id: string;
  name: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const sessionRes = await fetch("/api/auth/get-session", {
        credentials: "include",
      });
      const session = await sessionRes.json();
      if (cancelled) return;
      if (session === null || !session?.user) {
        router.replace("/sign-in");
        return;
      }

      const res = await fetch("/api/classes", { credentials: "include" });
      const json = await res.json();
      if (cancelled) return;
      setClasses(Array.isArray(json.data) ? json.data : []);
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 font-heading text-2xl font-semibold">Classes</h1>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {classes.map((c) => (
          <Card
            key={c.id}
            className="cursor-pointer transition-shadow hover:ring-2 hover:ring-ring/30"
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/dashboard/${c.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/dashboard/${c.id}`);
              }
            }}
          >
            <CardHeader>
              <CardTitle>{c.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              View subjects
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
