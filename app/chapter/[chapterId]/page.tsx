"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { use, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Chapter = {
  id: string;
  name: string;
  pdf_url: string;
  order: number;
  subject_id: string;
  created_at: string;
};

export default function ChapterPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string; citations?: any[] }[]
  >([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [subtopics, setSubtopics] = useState<
    { id: string; title: string; order: number }[]
  >([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);
  const [noteLength, setNoteLength] = useState<"short" | "medium" | "long">(
    "medium",
  );
  const [noteLanguage, setNoteLanguage] = useState<
    "easy" | "medium" | "advanced"
  >("easy");
  const [generatedNote, setGeneratedNote] = useState<string | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [subtopicsLoading, setSubtopicsLoading] = useState(false);
  const [testPhase, setTestPhase] = useState<"config" | "taking" | "results">(
    "config",
  );
  const [testSubtopics, setTestSubtopics] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium",
  );
  const [currentTest, setCurrentTest] = useState<any>(null);
  const [userAnswers, setUserAnswers] = useState<{
    [questionId: string]: string;
  }>({});
  const [testLoading, setTestLoading] = useState(false);
  const [attemptResult, setAttemptResult] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [mode, setMode] = useState<"chat" | "notes" | "test">("chat");
  const [numPages, setNumPages] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(600);

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const viewport = el.parentElement;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  async function sendMessage() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId,
          sessionId,
          message: text,
        }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        const { sessionId: sid, answer, citations } = json.data;
        setSessionId((prev) => prev ?? sid);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: answer, citations },
        ]);
      }
    } finally {
      setChatLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function run() {
      setSubtopicsLoading(true);
      try {
        const res = await fetch(
          `/api/chapters/${encodeURIComponent(chapterId)}/subtopics`,
          { method: "POST", credentials: "include" },
        );
        const json = await res.json();
        if (!cancelled) {
          setSubtopics(res.ok ? (json.data ?? []) : []);
        }
      } finally {
        if (!cancelled) {
          setSubtopicsLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, chapterId]);

  const toggleSubtopic = (title: string) => {
    setSelectedSubtopics((prev) =>
      prev.includes(title) ? prev.filter((s) => s !== title) : [...prev, title],
    );
  };

  const toggleTestSubtopic = (title: string) => {
    setTestSubtopics((prev) =>
      prev.includes(title) ? prev.filter((s) => s !== title) : [...prev, title],
    );
  };

  function exitTest() {
    setMode("chat");
    setTestPhase("config");
    setCurrentTest(null);
    setUserAnswers({});
    setAttemptResult(null);
    setCurrentQuestionIndex(0);
  }

  function takeAnotherTest() {
    setMode("chat");
    setTestPhase("config");
    setCurrentTest(null);
    setUserAnswers({});
    setAttemptResult(null);
    setCurrentQuestionIndex(0);
  }

  async function generateTest() {
    if (testSubtopics.length === 0) {
      alert("Please select at least one subtopic");
      return;
    }
    setTestLoading(true);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId,
          selectedSubtopics: testSubtopics,
          numQuestions,
          difficulty,
        }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setCurrentTest(json.data);
        setUserAnswers({});
        setCurrentQuestionIndex(0);
        setTestPhase("taking");
        setMode("test");
      }
    } finally {
      setTestLoading(false);
    }
  }

  async function submitTest() {
    if (!currentTest?.questions?.length) return;
    for (const q of currentTest.questions as { id: string }[]) {
      const a = userAnswers[q.id];
      if (a === undefined || String(a).trim() === "") {
        alert("Please answer all questions");
        return;
      }
    }
    setTestLoading(true);
    try {
      const res = await fetch(
        `/api/tests/${encodeURIComponent(currentTest.id)}/attempt`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: userAnswers }),
        },
      );
      const json = await res.json();
      if (res.ok && json.data) {
        setAttemptResult(json.data);
        setTestPhase("results");
      }
    } finally {
      setTestLoading(false);
    }
  }

  async function generateNotes() {
    if (selectedSubtopics.length === 0) {
      alert("Please select at least one subtopic");
      return;
    }
    setNotesLoading(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId,
          selectedSubtopics,
          length: noteLength,
          languageLevel: noteLanguage,
        }),
      });
      const json = await res.json();
      if (res.ok && json.data?.content) {
        setGeneratedNote(json.data.content);
      }
    } finally {
      setNotesLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const res = await fetch("/api/auth/get-session", {
        credentials: "include",
      });
      const session = await res.json();
      if (cancelled) return;
      if (session === null || !session?.user) {
        router.replace("/sign-in");
        return;
      }
      setAuthLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function run() {
      setDataLoading(true);
      const res = await fetch(`/api/chapters/${encodeURIComponent(chapterId)}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setChapter(null);
        setChapters([]);
        setDataLoading(false);
        return;
      }
      const ch = json.data ?? null;
      setChapter(ch);
      if (ch?.name) {
        document.title = ch.name;
      }
      if (ch?.subject_id) {
        const listRes = await fetch(
          `/api/chapters?subjectId=${encodeURIComponent(ch.subject_id)}`,
          { credentials: "include" },
        );
        const listJson = await listRes.json();
        if (cancelled) return;
        if (listRes.ok) {
          setChapters(listJson.data ?? []);
        } else {
          setChapters([]);
        }
      } else {
        setChapters([]);
      }
      setDataLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, chapterId]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  const isTest = mode === "test";

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-background">
      {!isTest ? (
        <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col border-r border-border">
          <div className="shrink-0 border-b border-border p-4">
            <h2 className="font-heading text-sm font-semibold">Chapters</h2>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-1 p-2">
              {chapters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => router.push(`/chapter/${c.id}`)}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                    c.id === chapterId
                      ? "border-l-2 border-primary bg-muted"
                      : "hover:bg-muted/50",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>
      ) : null}

      {!isTest ? (
        <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-border">
          <ScrollArea className="h-full min-h-0">
            <div className="p-6">
              {dataLoading ? (
                <p className="text-muted-foreground">Loading…</p>
              ) : (
                <div
                  ref={containerRef}
                  className="h-full overflow-y-auto p-4"
                >
                  {chapter?.pdf_url ? (
                    <Document
                      file={`/api/pdf-proxy?url=${encodeURIComponent(chapter.pdf_url)}`}
                      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    >
                      {Array.from({ length: numPages }, (_, i) => (
                        <Page
                          key={i + 1}
                          pageNumber={i + 1}
                          width={containerWidth - 32}
                          className="mb-4"
                        />
                      ))}
                    </Document>
                  ) : (
                    <p className="text-muted-foreground">No PDF available</p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      ) : null}

      <aside
        className={cn(
          "flex h-full min-h-0 shrink-0 flex-col overflow-hidden bg-card",
          isTest ? "w-full" : "w-96 border-l border-border",
        )}
      >
        {isTest ? (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border p-3">
            <span className="min-w-0 truncate font-heading text-sm font-semibold">
              {chapter?.name ?? "Chapter"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={exitTest}
            >
              Exit Test
            </Button>
          </div>
        ) : null}

        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "chat" | "notes" | "test")}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <div className="shrink-0 border-b border-border p-3">
            <TabsList variant="line" className="w-full">
              <TabsTrigger value="chat" className="flex-1">
                Chat
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex-1">
                Notes
              </TabsTrigger>
              <TabsTrigger value="test" className="flex-1">
                Test
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="chat"
            className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden border-0 p-0 outline-none data-[state=inactive]:hidden"
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <ScrollArea className="min-h-0 flex-1">
                <div
                  ref={messagesContainerRef}
                  className="flex flex-col gap-3 p-4"
                >
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex",
                        m.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div className="max-w-[85%]">
                        <div
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm",
                            m.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted",
                          )}
                        >
                          {m.content}
                        </div>
                        {m.role === "assistant" &&
                        m.citations &&
                        m.citations.length > 0 ? (
                          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {m.citations.map((c: any, ci: number) => (
                              <div key={ci}>
                                {typeof c?.snippet === "string"
                                  ? c.snippet
                                  : String(c)}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="sticky bottom-0 shrink-0 border-t border-border bg-card p-3">
                <div className="flex flex-col gap-2">
                  <Textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    disabled={chatLoading}
                    className="min-h-20 resize-none"
                  />
                  <Button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={chatLoading}
                  >
                    {chatLoading ? "Thinking..." : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent
            value="notes"
            className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden border-0 p-0 outline-none data-[state=inactive]:hidden"
          >
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-4 p-4">
                {subtopicsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Loading subtopics...
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Select Subtopics</h3>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedSubtopics(subtopics.map((s) => s.title))
                          }
                        >
                          Select All
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSubtopics([])}
                        >
                          Clear
                        </Button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {subtopics.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-start gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              id={`subtopic-${st.id}`}
                              checked={selectedSubtopics.includes(st.title)}
                              onChange={() => toggleSubtopic(st.title)}
                              className="mt-1"
                            />
                            <label
                              htmlFor={`subtopic-${st.id}`}
                              className="cursor-pointer leading-snug"
                            >
                              {st.title}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Length</h3>
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            ["short", "Short"],
                            ["medium", "Medium"],
                            ["long", "Long"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setNoteLength(value)}
                            className={cn(
                              "rounded-md border border-border px-3 py-1.5 text-sm transition-colors",
                              noteLength === value
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Language</h3>
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            ["easy", "Easy"],
                            ["medium", "Medium"],
                            ["advanced", "Advanced"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setNoteLanguage(value)}
                            className={cn(
                              "rounded-md border border-border px-3 py-1.5 text-sm transition-colors",
                              noteLanguage === value
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      type="button"
                      className="w-full"
                      disabled={notesLoading}
                      onClick={() => void generateNotes()}
                    >
                      Generate
                    </Button>

                    {generatedNote ? (
                      <div className="prose prose-sm max-w-none mt-4 border-t pt-4">
                        <ReactMarkdown>{generatedNote}</ReactMarkdown>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent
            value="test"
            className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden border-0 p-0 outline-none data-[state=inactive]:hidden"
          >
            {testPhase === "config" ? (
              <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-4 p-4">
                  {subtopicsLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Loading subtopics...
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">
                          Select Subtopics
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setTestSubtopics(subtopics.map((s) => s.title))
                            }
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setTestSubtopics([])}
                          >
                            Clear
                          </Button>
                        </div>
                        <div className="flex flex-col gap-2">
                          {subtopics.map((st) => (
                            <div
                              key={st.id}
                              className="flex items-start gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                id={`test-subtopic-${st.id}`}
                                checked={testSubtopics.includes(st.title)}
                                onChange={() => toggleTestSubtopic(st.title)}
                                className="mt-1"
                              />
                              <label
                                htmlFor={`test-subtopic-${st.id}`}
                                className="cursor-pointer leading-snug"
                              >
                                {st.title}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">
                          Number of questions
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {([3, 5, 10] as const).map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setNumQuestions(n)}
                              className={cn(
                                "rounded-md border border-border px-3 py-1.5 text-sm transition-colors",
                                numQuestions === n
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted",
                              )}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">Difficulty</h3>
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              ["easy", "Easy"],
                              ["medium", "Medium"],
                              ["hard", "Hard"],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setDifficulty(value)}
                              className={cn(
                                "rounded-md border border-border px-3 py-1.5 text-sm transition-colors",
                                difficulty === value
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button
                        type="button"
                        className="w-full"
                        disabled={testLoading}
                        onClick={() => void generateTest()}
                      >
                        Generate Test
                      </Button>
                    </>
                  )}
                </div>
              </ScrollArea>
            ) : null}

            {testPhase === "taking" && currentTest?.questions?.length ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 border-b border-border px-4 py-2 text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of{" "}
                  {currentTest.questions.length}
                </div>
                <ScrollArea className="min-h-0 flex-1">
                  {(() => {
                    const q = currentTest.questions[currentQuestionIndex] as {
                      id: string;
                      question_text: string;
                      options: string[];
                    };
                    const letters = ["A", "B", "C", "D"] as const;
                    return (
                      <div className="space-y-4 p-4">
                        <p className="text-sm font-medium leading-snug">
                          {q.question_text}
                        </p>
                        <div className="flex flex-col gap-2">
                          {letters.map((letter, i) => (
                            <button
                              key={letter}
                              type="button"
                              onClick={() =>
                                setUserAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: letter,
                                }))
                              }
                              className={cn(
                                "rounded-md border border-border px-3 py-2 text-left text-sm transition-colors",
                                userAnswers[q.id] === letter
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted",
                              )}
                            >
                              {q.options[i] ?? `${letter}.`}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </ScrollArea>
                <div className="flex shrink-0 flex-wrap gap-2 border-t border-border p-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentQuestionIndex === 0}
                    onClick={() =>
                      setCurrentQuestionIndex((i) => Math.max(0, i - 1))
                    }
                  >
                    Previous
                  </Button>
                  {currentQuestionIndex >= currentTest.questions.length - 1 ? (
                    <Button
                      type="button"
                      className="flex-1"
                      disabled={testLoading}
                      onClick={() => void submitTest()}
                    >
                      Submit Test
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() =>
                        setCurrentQuestionIndex((i) =>
                          Math.min(currentTest.questions.length - 1, i + 1),
                        )
                      }
                    >
                      Next
                    </Button>
                  )}
                </div>
              </div>
            ) : null}

            {testPhase === "results" && attemptResult ? (
              <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-4 p-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                    <p className="text-4xl font-bold tabular-nums">
                      {attemptResult.score}%
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {attemptResult.correct} / {attemptResult.total} correct
                    </p>
                  </div>

                  <ul className="flex flex-col gap-4">
                    {(attemptResult.results as any[]).map((r) => (
                      <li
                        key={r.questionId}
                        className="rounded-lg border border-border p-3 text-sm"
                      >
                        <div className="mb-2 flex items-start gap-2">
                          <span
                            className={cn(
                              "shrink-0 font-semibold",
                              r.isCorrect
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400",
                            )}
                          >
                            {r.isCorrect ? "\u2713" : "\u2717"}
                          </span>
                          <p className="font-medium leading-snug">
                            {r.question_text}
                          </p>
                        </div>
                        <p className="text-muted-foreground">
                          Your answer: {r.selectedAnswer || "—"} · Correct:{" "}
                          {r.correctAnswer}
                        </p>
                        <p className="mt-2 text-muted-foreground">
                          {r.explanation}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <Button
                    type="button"
                    className="w-full"
                    variant="outline"
                    onClick={takeAnotherTest}
                  >
                    Take Another Test
                  </Button>
                </div>
              </ScrollArea>
            ) : null}
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}
