"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "katex/dist/katex.min.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { use, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { useRouter } from "next/navigation";
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

  async function sendMessageWithText(text: string) {
    const t = text.trim();
    if (!t || chatLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: t }]);
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
          message: t,
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

  async function sendMessage() {
    await sendMessageWithText(chatInput);
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
      if (!cancelled && ch) {
        try {
          await fetch("/api/progress", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chapterId }),
          });
        } catch {
          /* ignore progress errors */
        }
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
  const fullScreenTest =
    isTest && (testPhase === "taking" || testPhase === "results");

  const tabTriggerClass =
    "h-auto flex-1 rounded-none border-0 border-b-2 border-transparent bg-transparent px-2 py-3 text-sm shadow-none after:hidden hover:text-[#555] focus-visible:ring-0 data-[state=active]:border-emerald-500 data-[state=active]:font-medium data-[state=active]:text-[#111] data-[state=inactive]:text-[#888]";

  if (fullScreenTest) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f0fdf8]">
        <header className="flex items-center justify-between border-b border-[#eaeaea] bg-white px-8 py-4">
          <span className="text-base font-semibold text-[#111]">
            {chapter?.name ?? "Chapter"}
          </span>
          <button
            type="button"
            onClick={exitTest}
            className="rounded-lg border border-[#ddd] px-4 py-2 text-sm hover:bg-[#f5f5f5]"
          >
            Exit Test
          </button>
        </header>

        {testPhase === "taking" && currentTest?.questions?.length ? (
          <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-8">
            <p className="mb-4 mt-6 text-center text-xs uppercase tracking-widest text-[#888]">
              Question {currentQuestionIndex + 1} of{" "}
              {currentTest.questions.length}
            </p>
            {(() => {
              const q = currentTest.questions[currentQuestionIndex] as {
                id: string;
                question_text: string;
                options: string[];
              };
              const letters = ["A", "B", "C", "D"] as const;
              return (
                <>
                  <div className="mx-auto mb-6 max-w-2xl rounded-2xl border border-[#eaeaea] bg-white p-8 shadow-sm">
                    <p className="mb-6 text-base font-medium leading-relaxed text-[#111]">
                      {q.question_text}
                    </p>
                    <div className="flex flex-col">
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
                            "mb-3 w-full rounded-xl border border-[#eaeaea] px-5 py-3.5 text-left text-sm text-[#333] transition-all hover:border-emerald-200 hover:bg-emerald-50",
                            userAnswers[q.id] === letter &&
                              "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-600",
                          )}
                        >
                          {q.options[i] ?? `${letter}.`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mx-auto mt-6 flex max-w-2xl justify-between">
                    <button
                      type="button"
                      disabled={currentQuestionIndex === 0}
                      onClick={() =>
                        setCurrentQuestionIndex((i) => Math.max(0, i - 1))
                      }
                      className="rounded-xl border border-[#ddd] px-4 py-2.5 text-sm hover:bg-[#f5f5f5] disabled:opacity-40"
                    >
                      Previous
                    </button>
                    {currentQuestionIndex >= currentTest.questions.length - 1 ? (
                      <button
                        type="button"
                        disabled={testLoading}
                        onClick={() => void submitTest()}
                        className="rounded-xl bg-[#111] px-6 py-2.5 text-sm font-medium text-white"
                      >
                        Submit Test
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentQuestionIndex((i) =>
                            Math.min(currentTest.questions.length - 1, i + 1),
                          )
                        }
                        className="rounded-xl bg-[#111] px-6 py-2.5 text-sm font-medium text-white"
                      >
                        Next
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        ) : null}

        {testPhase === "results" && attemptResult ? (
          <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-8">
            <div className="mx-auto mb-6 mt-8 max-w-2xl rounded-2xl border border-[#eaeaea] bg-white p-8 text-center shadow-sm">
              <p className="text-6xl font-bold text-[#111]">
                {attemptResult.score}%
              </p>
              <p className="mt-2 text-sm text-[#888]">
                {attemptResult.correct} / {attemptResult.total} correct
              </p>
            </div>

            <ul className="mx-auto flex w-full max-w-2xl flex-col">
              {(attemptResult.results as any[]).map((r) => (
                <li
                  key={r.questionId}
                  className={cn(
                    "mb-3 rounded-xl border p-5",
                    r.isCorrect
                      ? "border-green-100 bg-green-50/30"
                      : "border-red-100 bg-red-50/30",
                  )}
                >
                  <p className="mb-2 text-sm font-medium text-[#111]">
                    {r.question_text}
                  </p>
                  <p className="text-xs text-[#666]">
                    Your answer: {r.selectedAnswer || "—"} · Correct:{" "}
                    {r.correctAnswer}
                  </p>
                  <p className="mt-2 text-xs italic text-[#888]">
                    {r.explanation}
                  </p>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={takeAnotherTest}
              className="mx-auto mt-4 block w-full max-w-2xl rounded-xl bg-[#111] py-3 text-center text-sm font-medium text-white"
            >
              Take Another Test
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 overflow-hidden">
      {!isTest ? (
        <aside className="flex h-full min-h-0 w-56 shrink-0 flex-col border-r border-[#eaeaea] bg-[#fafafa]">
          <div className="shrink-0 border-b border-[#eaeaea] px-4 py-3">
            <span className="mr-1 text-xs text-emerald-500">●</span>
            <span className="text-sm font-semibold text-[#111]">AI Gurukul</span>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-xs text-[#888] hover:text-emerald-600 transition-colors px-4 py-2"
          >
            ← Back
          </button>
          <div className="shrink-0 border-b border-[#eaeaea] px-4 py-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#888]">
              Chapters
            </h2>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col py-1">
              {chapters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => router.push(`/chapter/${c.id}`)}
                  className={cn(
                    "mx-2 my-1 cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm transition-all",
                    c.id === chapterId
                      ? "border border-emerald-100 bg-emerald-50 font-medium text-emerald-700"
                      : "text-[#444] hover:bg-[#f0f0f0]",
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
        <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
          <ScrollArea className="h-full min-h-0">
            {dataLoading ? (
              <div className="p-6">
                <p className="text-muted-foreground">Loading…</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-[#eaeaea] bg-white px-6 py-3">
                  <span className="text-xs text-[#888]">📄</span>
                  <span className="text-xs font-medium text-[#555]">
                    {chapter?.name}
                  </span>
                </div>
                <div
                  ref={containerRef}
                  className="h-full overflow-y-auto p-6"
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
              </>
            )}
          </ScrollArea>
        </main>
      ) : null}

      <aside
        className={cn(
          "flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-l border-[#eaeaea] bg-white",
          isTest ? "w-full" : "w-96",
        )}
      >
        {isTest ? (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#eaeaea] px-4 py-3">
            <span className="min-w-0 truncate text-base font-semibold text-[#111]">
              {chapter?.name ?? "Chapter"}
            </span>
            <button
              type="button"
              onClick={exitTest}
              className="shrink-0 rounded-lg border border-[#ddd] px-4 py-2 text-sm hover:bg-[#f5f5f5]"
            >
              Exit Test
            </button>
          </div>
        ) : null}

        <div className="shrink-0 border-b border-[#eaeaea] bg-[#fafafa] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888]">
            AI Assistant
          </p>
        </div>

        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "chat" | "notes" | "test")}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <div className="shrink-0 border-b border-[#eaeaea] px-4">
            <TabsList
              variant="line"
              className="flex h-auto w-full justify-start gap-6 rounded-none border-0 bg-transparent p-0"
            >
              <TabsTrigger value="chat" className={tabTriggerClass}>
                Chat
              </TabsTrigger>
              <TabsTrigger value="notes" className={tabTriggerClass}>
                Notes
              </TabsTrigger>
              <TabsTrigger value="test" className={tabTriggerClass}>
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
                {messages.length === 0 ? (
                  <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center">
                    <div className="mb-4 text-4xl">🤖</div>
                    <p className="mb-1 text-sm font-medium text-[#333]">
                      Ask anything about this chapter
                    </p>
                    <p className="text-xs text-[#999]">
                      I&apos;ll answer based on the actual PDF content
                    </p>
                    <div className="mt-6 flex w-full flex-col gap-2">
                      {[
                        "What is Newton's First Law?",
                        "Explain inertia with examples",
                        "Summarize this chapter",
                      ].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => {
                            void sendMessageWithText(q);
                          }}
                          className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-left text-xs text-emerald-700 transition-colors hover:bg-emerald-100"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    ref={messagesContainerRef}
                    className="flex flex-col gap-3 px-4 py-4"
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
                                ? "bg-emerald-600 text-white"
                                : "border border-emerald-100 bg-[#f0fdf8] text-[#111]",
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
                )}
              </ScrollArea>
              <div className="shrink-0 border-t border-[#eaeaea] bg-white p-3">
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
                    placeholder="Ask a question about this chapter..."
                    className="min-h-20 w-full resize-none rounded-xl border border-[#eaeaea] p-3 text-sm focus:border-emerald-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={chatLoading}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {chatLoading ? "Thinking..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent
            value="notes"
            className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden border-0 p-0 outline-none data-[state=inactive]:hidden"
          >
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col px-4 py-4">
                {subtopicsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Loading subtopics...
                  </p>
                ) : (
                  <>
                    <p className="mb-4 text-sm font-semibold text-[#111]">
                      📝 Generate Notes
                    </p>
                    <div>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#888]">
                        Select Subtopics
                      </h3>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSubtopics(subtopics.map((s) => s.title))
                          }
                          className="rounded-md border border-[#ddd] bg-[#fafafa] px-3 py-1 text-xs hover:bg-[#f0f0f0]"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSubtopics([])}
                          className="rounded-md border border-[#ddd] bg-[#fafafa] px-3 py-1 text-xs hover:bg-[#f0f0f0]"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="flex flex-col">
                        {subtopics.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center gap-2 py-1.5 text-sm text-[#333]"
                          >
                            <input
                              type="checkbox"
                              id={`subtopic-${st.id}`}
                              checked={selectedSubtopics.includes(st.title)}
                              onChange={() => toggleSubtopic(st.title)}
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

                    <div className="my-4 border-t border-[#eee]" />

                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#888]">
                        Length
                      </h3>
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
                              "rounded-lg border border-[#ddd] px-3 py-1.5 text-sm",
                              noteLength === value
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "bg-white hover:bg-[#fafafa]",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="my-4 border-t border-[#eee]" />

                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#888]">
                        Language
                      </h3>
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
                              "rounded-lg border border-[#ddd] px-3 py-1.5 text-sm",
                              noteLanguage === value
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "bg-white hover:bg-[#fafafa]",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={notesLoading}
                      onClick={() => void generateNotes()}
                      className="mt-4 w-full rounded-xl bg-[#111] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-50"
                    >
                      Generate
                    </button>

                    {generatedNote ? (
                      <div className="prose prose-sm mt-4 max-w-none border-t pt-4">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {generatedNote}
                        </ReactMarkdown>
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
                <div className="mx-auto max-w-sm px-4 py-4">
                  {subtopicsLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Loading subtopics...
                    </p>
                  ) : (
                    <>
                      <div className="mb-5">
                        <p className="text-sm font-semibold text-[#111]">
                          🧪 Generate Test
                        </p>
                        <p className="mt-0.5 text-xs text-[#999]">
                          Select topics and configure your test
                        </p>
                      </div>
                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#888]">
                          Select Subtopics
                        </h3>
                        <div className="mb-3">
                          <button
                            type="button"
                            onClick={() =>
                              setTestSubtopics(subtopics.map((s) => s.title))
                            }
                            className="mr-2 rounded-md border border-[#ddd] bg-[#fafafa] px-2.5 py-1 text-xs hover:bg-[#eee]"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={() => setTestSubtopics([])}
                            className="mr-2 rounded-md border border-[#ddd] bg-[#fafafa] px-2.5 py-1 text-xs hover:bg-[#eee]"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex flex-col">
                          {subtopics.map((st) => (
                            <div
                              key={st.id}
                              className="flex cursor-pointer items-center gap-2 py-1 text-xs text-[#444]"
                            >
                              <input
                                type="checkbox"
                                id={`test-subtopic-${st.id}`}
                                checked={testSubtopics.includes(st.title)}
                                onChange={() => toggleTestSubtopic(st.title)}
                                className="h-3.5 w-3.5 accent-emerald-500"
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

                      <div className="my-4 border-t border-[#eee]" />

                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#888]">
                          Number of questions
                        </h3>
                        <div className="flex gap-2">
                          {([3, 5, 10] as const).map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setNumQuestions(n)}
                              className={cn(
                                "rounded-lg border border-[#ddd] px-4 py-1.5 text-xs text-[#444] transition-colors hover:border-emerald-300",
                                numQuestions === n
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "",
                              )}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="my-4 border-t border-[#eee]" />

                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#888]">
                          Difficulty
                        </h3>
                        <div className="flex gap-2">
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
                                "rounded-lg border border-[#ddd] px-4 py-1.5 text-xs text-[#444] transition-colors hover:border-emerald-300",
                                difficulty === value
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={testLoading}
                        onClick={() => void generateTest()}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#111] px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-50"
                      >
                        Generate Test
                      </button>
                    </>
                  )}
                </div>
              </ScrollArea>
            ) : null}
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}
