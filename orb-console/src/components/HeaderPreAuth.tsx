"use client";

import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { Weave } from "@/components/Weave";
import colors from "tailwindcss/colors";

type HeaderPreAuthProps = {
  subtitle: string;
};

export function HeaderPreAuth({ subtitle }: HeaderPreAuthProps) {
  const { status } = useSession();

  return (
    <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-6 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex w-10 h-10 hover:opacity-70 cursor-pointer transition-opacity"
          >
            <Weave fill={colors.slate[600]} className="w-full h-full" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-300">Fetter IO</h1>
            <p className="text-xs text-gray-400">{subtitle}</p>
          </div>
        </div>
        {status !== "authenticated" ? (
          <button
            onClick={() => signIn("github", { callbackUrl: "/app" })}
            className="button-entry"
          >
            Sign in with GitHub
          </button>
        ) : (
          <a href="/app" className="button-entry">
            Back to Console
          </a>
        )}
      </div>
    </header>
  );
}
