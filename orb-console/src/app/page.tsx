"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { Package } from "@/types";
import { PackageCard } from "@/components/PackageCard";
import { Footer } from "@/components/Footer";
import { useDashboardData } from "@/hooks/useDashboardData";
import { SystemTagCard } from "@/components/SystemTagCard";
import { DashboardStatus } from "@/components/DashboardStatus";

type Tab = "packages" | "tags" | "other";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("packages");

  // fetcher of packages
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
    pollInterval: 30000, // every 30 seconds
  });

  // fetcher of system tags
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
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          <p>fetter</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4">
          <button
            className={activeTab === "packages" ? "font-bold" : ""}
            onClick={() => setActiveTab("packages")}
          >
            Packages
          </button>
          <button
            className={activeTab === "tags" ? "font-bold" : ""}
            onClick={() => setActiveTab("tags")}
          >
            System Tags
          </button>
          <button
            className={activeTab === "other" ? "font-bold" : ""}
            onClick={() => setActiveTab("other")}
          >
            Something Else
          </button>
        </div>

        {/* Packages tab */}
        {activeTab === "packages" && (
          <div>
            <DashboardStatus label="packages" state={packagesState} />

            <div className="flex flex-col gap-4 mt-4">
              {packagesState.data?.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          </div>
        )}

        {activeTab === "tags" && (
          <div>
            <DashboardStatus label="system tags" state={tagsState} />

            <div className="flex flex-col gap-4 mt-4 w-full">
              {tagsState.data?.map((tag) => (
                <SystemTagCard key={tag.id} tag={tag} />
              ))}
            </div>
          </div>
        )}

        {activeTab === "other" && (
          <div className="text-gray-500 mt-4">Other content here</div>
        )}
      </main>
      <Footer />
    </div>
  );
}
