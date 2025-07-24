"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Dashboard from "@/components/Dashboard";

export default function AppPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/"); // redirect to landing page
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className="text-white p-4">Loading...</div>;
  }

  if (status === "authenticated") {
    return <Dashboard />;
  }

  return null;
}
