"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Package } from "@/types";
import { PackageCard } from "@/components/PackageCard";

export default function Home() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [status, setStatus] = useState("loading...");

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
        setStatus("fetter-orb error");
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

        <div className="flex flex-col gap-4 mt-4">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      </main>

      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com/fetter-io"
          target="_blank"
          rel="noopener noreferrer"
        >
          fetter.io
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com/fetter-io/fetter-orb/blob/default/README.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          Fetter Orb Docs
        </a>
      </footer>
    </div>
  );
}
