// src/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      login: string;
      user_id: number;
    };
  }

  interface User extends DefaultUser {
    login: string;
    user_id: number;
  }

  interface JWT {
    login: string;
    user_id: number;
  }
}
