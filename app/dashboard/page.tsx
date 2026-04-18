"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ClassItem = {
  id: string;
  name: string;
};

function DashboardSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-[#eaeaea] bg-white p-5"
        >
          <div className="mb-3 h-4 w-3/4 rounded bg-[#eaeaea]" />
          <div className="h-3 w-1/2 rounded bg-[#f3f3f3]" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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
      const data = Array.isArray(json.data) ? json.data : [];
      const sorted = data.sort((a: any, b: any) => {
        const numA = parseInt(a.name.replace("Class ", ""));
        const numB = parseInt(b.name.replace("Class ", ""));
        return numA - numB;
      });
      setClasses(sorted);
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!mounted) return null;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-8 border-l-4 border-emerald-400 pl-4">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111]">
          Classes
        </h1>
        <p className="mt-1 text-sm uppercase tracking-widest text-[#888]">
          Select your class
        </p>
      </div>
      {loading ? (
        <DashboardSkeletonGrid />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {classes.map((c) => (
            <div
              key={c.id}
              className="cursor-pointer rounded-2xl border border-[#eaeaea] bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
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
              <div className="mb-2 text-2xl">🎓</div>
              <div className="text-base font-semibold text-[#111]">{c.name}</div>
              <div className="mt-1 text-sm text-[#888]">View subjects</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
