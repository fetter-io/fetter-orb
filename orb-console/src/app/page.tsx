// src/app/page.tsx
"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/app");
    }
  }, [status, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-white bg-slate-950">
      <h1 className="text-4xl font-bold mb-4">Welcome to Fetter</h1>
      <p className="mb-6 text-lg text-slate-300">Package integrity for the modern org.</p>
      {status !== "authenticated" && (
        <button
          onClick={() => signIn("github")}
          className="px-4 py-2 bg-white text-black rounded"
        >
          Sign in with GitHub
        </button>
      )}
    </main>
  );
}
