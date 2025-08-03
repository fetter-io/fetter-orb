// src/app/page.tsx
"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LandingFeature } from "@/components/LandingFeature";
import { Footer } from "@/components/Footer";

import { Weave } from "@/components/Weave";
import { WaveDivider } from "@/components/WaveDivider";

import colors from "tailwindcss/colors";

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/app");
    }
  }, [status, router]);

  return (
    <main className="min-h-screen font-[family-name:var(--font-geist-sans)] text-white bg-gradient-to-b from-slate-950 to-slate-900">
      <section className="flex flex-col items-center justify-center text-center py-32 px-4">
        <div className="flex w-32 h-32 mb-4">
          <Weave fill={colors.slate[600]} className="w-full h-full" />
        </div>
        <h1 className="text-4xl font-bold text-zinc-500 mb-2">Fetter Orb</h1>
        <p className="text-lg text-zinc-400 mb-6">
          Python Supply-Chain Transparency
        </p>

        {status !== "authenticated" && (
          <button
            onClick={() => signIn("github")}
            className="px-4 py-2 bg-slate-800 text-zinc-400 rounded hover:bg-slate-700 hover:text-zinc-200 cursor-pointer transition-colors duration-150 border border-blue-600/50  hover:border-blue-400"
          >
            Sign in with GitHub
          </button>
        )}
      </section>

      <WaveDivider
        height={80}
        controlPoints={[20, 0, 400, 15]}
        fillClass="text-slate-900"
        flip={true}
      />

      <LandingFeature
        title="Track All Python Packages"
        description="See every installed package across your entire system fleet, organized by environment."
        imageSrc="/screenshot.png"
      />

      <WaveDivider
        height={80}
        controlPoints={[800, 0, 2000, 15]}
        fillClass="text-slate-900"
        flip={false}
      />

      <LandingFeature
        title="Monitor for Vulnerabilities"
        description="Fetter Orb flags vulnerable packages in real time using OSV data."
        imageSrc="/screenshot.png"
        reverse
      />

      <WaveDivider
        height={80}
        controlPoints={[20, 0, 400, 15]}
        fillClass="text-slate-900"
        flip={true}
      />

      <LandingFeature
        title="Validate Against an Allow List"
        description="Define approved package versions and ensure compliance everywhere."
        imageSrc="/screenshot.png"
      />

      <footer className="bg-slate-950 border-t border-slate-700 px-6 py-4">
        <Footer />
      </footer>
    </main>
  );
}
