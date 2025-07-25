"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { useEffect } from "react";

export default function AppPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/"); // Redirect to landing page if not logged in
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
