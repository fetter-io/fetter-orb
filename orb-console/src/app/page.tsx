// src/app/page.tsx
"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Weave } from "@/components/Weave";
import colors from "tailwindcss/colors";

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();
``
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/app");
    }
  }, [status, router]);

  return (
    <main className="min-h-screen font-[family-name:var(--font-geist-sans)] flex flex-col items-center justify-center text-white bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="flex w-32 h-32 ">
        <Weave fill={colors.slate[600]} className="w-full h-full" />
      </div>

      <h1 className="text-4xl font-bold mb-4 text-zinc-500">Fetter Orb</h1>

      <p className="mb-6 text-lg text-zinc-400">
        Python Supply-Chain Transparency
      </p>

      {status !== "authenticated" && (
        <button
          onClick={() => signIn("github")}
          className="px-4 py-2 bg-slate-600 text-zinc-300 rounded"
        >
          Sign in with GitHub
        </button>
      )}
    </main>
  );
}
