"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AppContent from "@/components/AppContent";

export default function AppPage() {
  const { data: session, status } = useSession();
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
    return <AppContent />;
  }

  return null;
}
