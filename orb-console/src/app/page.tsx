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
        <h1 className="text-4xl font-bold text-zinc-400 mb-2">Fetter Orb</h1>

        <p className="text-lg text-zinc-400">Python Supply-Chain Omniscience</p>
        <p className="text-xs text-zinc-600 mb-6">v0.9.0 Beta</p>

        {status !== "authenticated" && (
          <button onClick={() => signIn("github")} className="button-entry">
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
        description="See every installed package and version, along with associated vulnerabilities, across an entire organization."
        imageSrc="/screen-package.png"
        reverse={false}
      />

      <WaveDivider
        height={80}
        controlPoints={[800, 0, 2000, 15]}
        fillClass="text-slate-900"
        flip={false}
      />

      <LandingFeature
        title="Monitor Vulnerabilities"
        description="See details on vulnerable packages in real time using the Open Source Vulnerability database."
        imageSrc="/screen-vulns.png"
        reverse={false}
      />

      <WaveDivider
        height={80}
        controlPoints={[800, 0, 2000, 15]}
        fillClass="text-slate-900"
        flip={false}
      />

      <LandingFeature
        title="Validate Against a Global Allow List"
        description="Define approved packages and identify outliers."
        imageSrc="/screen-allow.png"
        reverse={true}
      />


      <WaveDivider
        height={80}
        controlPoints={[800, 0, 800, 0]}
        fillClass="text-slate-900"
        flip={true}
      />

      <LandingFeature
        title="A Secure, Open-Source Agent"
        description="End-point scans are published with fetter, an efficient client written in Rust."
        imageSrc="/screen-sys.png"
        reverse={true}
      />

      <footer className="bg-slate-950 border-t border-slate-700 px-6 py-4">
        <Footer />
      </footer>
    </main>
  );
}
