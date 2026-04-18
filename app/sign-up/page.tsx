"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const res = await signUp.email({
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
    });
    if (res.error) {
      setError(res.error.message ?? "Something went wrong.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0fdf8]">
      <main className="w-full max-w-sm rounded-2xl border border-[#eaeaea] bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="text-2xl text-emerald-500">●</span>
          <p className="mt-1 text-lg font-semibold text-[#111]">AI Gurukul</p>
          <p className="mt-1 text-sm text-[#888]">Sign up to continue</p>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Sign up
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-zinc-900 underline dark:text-zinc-50"
          >
            Sign in
          </Link>
        </p>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Name</span>
          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Create account
        </button>
        </form>
      </main>
    </div>
  );
}
