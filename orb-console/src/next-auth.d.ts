// src/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
// import { JWT } from "next-auth/jwt";
// import { Profile } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      login: string;
      user_id: number;
    };
  }

  interface User extends DefaultUser {
    login?: string; // Optional to match GitHub response safely
    user_id?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    login?: string;
    user_id?: number;
  }
}

declare module "next-auth/providers" {
  interface Profile {
    login?: string;
    id?: number; // GitHub user ID
  }
}
