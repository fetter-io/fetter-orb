// src/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { UUID } from "@/types";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      github_login: string;
      github_id: number;
      user_id: UUID;
    };
  }

  interface User extends DefaultUser {
    github_login?: string;
    github_id?: number;
    user_id?: UUID;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    github_login?: string;
    github_id?: number;
    user_id?: UUID;
  }
}

// declare module "next-auth/providers" {
//   interface Profile {
//     github_login?: string;
//     id?: number; // GitHub user ID
//   }
// }
