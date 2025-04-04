"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { Package, SystemTag } from "@/types";
import { PackageCard } from "@/components/PackageCard";
import { Footer } from "@/components/Footer";
import { useDashboardData } from "@/hooks/useDashboardData";
import { SystemTagCard } from "@/components/SystemTagCard";
import { DashboardStatus } from "@/components/DashboardStatus";
import { TabSelector } from "@/components/TabSelector";

type Tab = "packages" | "tags" | "other";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("packages");

  // fetch packages
  const fetchPackages = useCallback(async (): Promise<Package[]> => {
    const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
    const res = await fetch(`${apiBase}/package`);
    const raw = await res.json();
    return raw.map(([id, pkg]: [number, Omit<Package, "id">]) => ({
      id,
      ...pkg,
    }));
  }, []);

  const packagesState = useDashboardData(fetchPackages, {
    active: activeTab === "packages",
    pollInterval: 30000,
  });

  // fetch system tags
  const fetchSystemTags = useCallback(async (): Promise<SystemTag[]> => {
    const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
    const res = await fetch(`${apiBase}/system_tag`);
    const raw = await res.json();
    return raw.map(([id, tag]: [number, Omit<SystemTag, "id">]) => ({
      id,
      ...tag,
    }));
  }, []);

  const tagsState = useDashboardData(fetchSystemTags, {
    active: activeTab === "tags",
    pollInterval: 30000,
  });

  return (
    <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900 border-b border-slate-600 px-6 py-4">
        <div className="flex gap-4 items-center mb-2">
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          <p className="font-semibold">fetter</p>
        </div>
        <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          {activeTab === "packages" && (
            <>
              <DashboardStatus label="packages" state={packagesState} />
              <div className="flex flex-col gap-4">
                {packagesState.data?.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} />
                ))}
              </div>
            </>
          )}

          {activeTab === "tags" && (
            <>
              <DashboardStatus label="system tags" state={tagsState} />
              <div className="flex flex-col gap-4 w-full">
                {tagsState.data?.map((tag) => (
                  <SystemTagCard key={tag.id} tag={tag} />
                ))}
              </div>
            </>
          )}

          {activeTab === "other" && (
            <div className="text-gray-500 mt-4">Other content here</div>
          )}
        </div>
      </main>

      {/* Sticky Footer */}
      <footer className="bg-slate-900 border-t border-slate-600 px-6 py-4">
        <Footer />
      </footer>
    </div>
  );
}
