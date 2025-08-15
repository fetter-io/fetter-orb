"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { useEffect } from "react";
import Terms from "@/components/Terms";

export default function AppPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [acceptedTerms, setAcceptedTerms] = useState<boolean | null>(null);

  console.log(
    `calling AppPage: ${status}, user_id is ${session?.user?.user_id}`,
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.user_id) return;

    const checkTerms = async () => {
      console.log("calling checkTerms");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_ORB_MODEL}/user_terms?user_id=${session.user.user_id}`,
      );
      const data = await res.json();
      setAcceptedTerms(data.term_accepted);
    };

    checkTerms();
  }, [status, session?.user?.user_id]);

  if (status === "loading" || acceptedTerms === null) {
    console.log(`status: ${status}`);
    return <div className="text-white p-4">Loading...</div>;
  }

  if (!acceptedTerms) {
    return <Terms onAccepted={() => setAcceptedTerms(true)} />;
  }

  return <Dashboard />;
}
