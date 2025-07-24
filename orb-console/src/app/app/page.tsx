"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Dashboard from "@/components/Dashboard";

export default function AppPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [postedLogin, setPostedLogin] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user && !postedLogin) {
      const postLogin = async () => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_ORB_MODEL}/on_login`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                github_id: session.user.id,
                login: session.user.login,
                email: session.user.email,
                name: session.user.name,
              }),
            },
          );

          if (!res.ok) {
            console.error("Failed to sync login:", await res.text());
          } else {
            setPostedLogin(true);
          }
        } catch (err) {
          console.error("Login post failed", err);
        }
      };

      postLogin();
    }
  }, [status, session, postedLogin]);

  if (status === "loading") {
    return <div className="text-white p-4">Loading...</div>;
  }

  if (status === "authenticated") {
    return <Dashboard />;
  }

  return null;
}
