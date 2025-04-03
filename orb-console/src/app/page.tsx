"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Package } from "@/types";
import { PackageCard } from "@/components/PackageCard";
import { Footer } from "@/components/Footer";

type Tab = "packages" | "tags" | "other";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("packages");
  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL;

    fetch(`${apiBase}/package`)
      .then((res) => res.json())
      .then((data) => {
        // Convert [id, {name, key, ...}] → {id, name, key, ...}
        const parsed: Package[] = data.map(
          ([id, pkg]: [number, Omit<Package, "id">]) => ({ id, ...pkg }),
        );
        setPackages(parsed);
      })
      .catch((err) => {
        console.error("Error fetching /package:", err);
      });
  }, []);

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


        {activeTab === "packages" && (
          <div className="flex flex-col gap-4 mt-4">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </div>
        )}

        {activeTab === "tags" && (
          <div className="text-gray-500 mt-4">System tags go here</div>
        )}

        {activeTab === "other" && (
          <div className="text-gray-500 mt-4">Other content here</div>
        )}
      </main>
      <Footer />
    </div>
  );
}
