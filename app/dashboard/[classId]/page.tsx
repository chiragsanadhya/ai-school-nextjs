"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ClassItem = {
  id: string;
  name: string;
};

type SubjectItem = {
  id: string;
  name: string;
};

const SUBJECT_EMOJI: Record<string, string> = {
  Physics: "⚡",
  Mathematics: "📐",
  Chemistry: "🧪",
  Biology: "🌿",
  History: "📜",
  Geography: "🌍",
  Civics: "⚖️",
  Economics: "📊",
  English: "📖",
  Hindi: "🖊️",
};

function subjectEmoji(name: string) {
  return SUBJECT_EMOJI[name] ?? "📚";
}

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

export default function ClassDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState<string>("");
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

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

      const [classesRes, subjectsRes] = await Promise.all([
        fetch("/api/classes", { credentials: "include" }),
        fetch(`/api/subjects?classId=${encodeURIComponent(classId)}`, {
          credentials: "include",
        }),
      ]);

      const classesJson = await classesRes.json();
      const subjectsJson = await subjectsRes.json();
      if (cancelled) return;

      const allClasses: ClassItem[] = Array.isArray(classesJson.data)
        ? classesJson.data
        : [];
      const found = allClasses.find((c) => c.id === classId);
      setClassName(found?.name ?? "Class");

      setSubjects(
        Array.isArray(subjectsJson.data) ? subjectsJson.data : [],
      );
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, classId]);

  if (!mounted) return null;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      {loading ? (
        <>
          <div className="mb-8 border-l-4 border-emerald-400 pl-4">
            <div className="mb-2 h-9 w-48 animate-pulse rounded bg-[#eaeaea]" />
            <p className="mt-1 text-sm uppercase tracking-widest text-[#888]">
              Select a subject
            </p>
          </div>
          <DashboardSkeletonGrid />
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 cursor-pointer text-sm text-[#888] transition-colors hover:text-[#111]"
          >
            ← Back
          </button>
          <div className="mb-8 border-l-4 border-emerald-400 pl-4">
            <h1 className="text-3xl font-semibold tracking-tight text-[#111]">
              {className}
            </h1>
            <p className="mt-1 text-sm uppercase tracking-widest text-[#888]">
              Select a subject
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {subjects.map((s) => (
              <div
                key={s.id}
                className="cursor-pointer rounded-2xl border border-[#eaeaea] bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/dashboard/${classId}/${s.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/dashboard/${classId}/${s.id}`);
                  }
                }}
              >
                <div className="mb-2 text-2xl">{subjectEmoji(s.name)}</div>
                <div className="text-base font-semibold text-[#111]">{s.name}</div>
                <div className="mt-1 text-sm text-[#888]">View chapters</div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
