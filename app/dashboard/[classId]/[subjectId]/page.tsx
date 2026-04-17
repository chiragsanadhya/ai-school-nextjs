"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type SubjectItem = {
  id: string;
  name: string;
};

type ChapterItem = {
  id: string;
  name: string;
  order: number;
};

export default function SubjectChaptersPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;
  const subjectId = params.subjectId as string;

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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-heading text-2xl font-semibold">{subjectName}</h1>
      <p className="mb-4 text-sm text-muted-foreground">Chapters</p>
      <ul className="flex flex-col gap-2">
        {sortedChapters.map((ch) => (
          <li key={ch.id}>
            <Button
              variant="outline"
              className="h-auto w-full justify-start py-3 text-left font-normal"
              onClick={() => router.push(`/chapter/${ch.id}`)}
            >
              {ch.name}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
