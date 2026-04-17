"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ClassItem = {
  id: string;
  name: string;
};

type SubjectItem = {
  id: string;
  name: string;
};

export default function ClassDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;

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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 font-heading text-2xl font-semibold">{className}</h1>
      <p className="mb-4 text-sm text-muted-foreground">Subjects</p>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {subjects.map((s) => (
          <Card
            key={s.id}
            className="cursor-pointer transition-shadow hover:ring-2 hover:ring-ring/30"
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
            <CardHeader>
              <CardTitle>{s.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              View chapters
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
