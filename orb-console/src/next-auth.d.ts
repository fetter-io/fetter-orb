// src/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { UUID } from "@/types";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      login: string;
      user_id: UUID;
    };
  }

  interface User extends DefaultUser {
    login?: string; // Optional to match GitHub response safely
    user_id?: UUID;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    login?: string;
    user_id?: UUID;
  }
}

declare module "next-auth/providers" {
  interface Profile {
    login?: string;
    id?: number; // GitHub user ID
  }
}
