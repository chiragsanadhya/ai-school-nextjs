"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type SubjectItem = {
  id: string;
  name: string;
};

type ChapterItem = {
  id: string;
  name: string;
  order: number;
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

export default function SubjectChaptersPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;
  const subjectId = params.subjectId as string;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [loading, setLoading] = useState(true);
  const [subjectName, setSubjectName] = useState<string>("");
  const [chapters, setChapters] = useState<ChapterItem[]>([]);

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.order - b.order),
    [chapters],
  );

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

      const [subjectsRes, chaptersRes] = await Promise.all([
        fetch(`/api/subjects?classId=${encodeURIComponent(classId)}`, {
          credentials: "include",
        }),
        fetch(`/api/chapters?subjectId=${encodeURIComponent(subjectId)}`, {
          credentials: "include",
        }),
      ]);

      const subjectsJson = await subjectsRes.json();
      const chaptersJson = await chaptersRes.json();
      if (cancelled) return;

      const subjectList: SubjectItem[] = Array.isArray(subjectsJson.data)
        ? subjectsJson.data
        : [];
      const found = subjectList.find((s) => s.id === subjectId);
      setSubjectName(found?.name ?? "Subject");

      setChapters(
        Array.isArray(chaptersJson.data) ? chaptersJson.data : [],
      );
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, classId, subjectId]);

  if (!mounted) return null;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      {loading ? (
        <>
          <div className="mb-8 border-l-4 border-emerald-400 pl-4">
            <div className="mb-2 h-9 w-48 animate-pulse rounded bg-[#eaeaea]" />
            <p className="mt-1 text-sm uppercase tracking-widest text-[#888]">
              Select a chapter
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
              {subjectName}
            </h1>
            <p className="mt-1 text-sm uppercase tracking-widest text-[#888]">
              Select a chapter
            </p>
          </div>
          <ul className="flex flex-col gap-4">
            {sortedChapters.map((ch) => (
              <li key={ch.id}>
                <div
                  className="flex cursor-pointer items-center justify-between rounded-2xl border border-[#eaeaea] bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/chapter/${ch.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/chapter/${ch.id}`);
                    }
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-[#aaa]">{ch.order}</span>
                    <span className="text-base font-medium text-[#111]">
                      {ch.name}
                    </span>
                  </div>
                  <span className="text-[#bbb]">→</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
