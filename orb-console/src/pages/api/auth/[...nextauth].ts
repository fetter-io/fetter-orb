import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import type { NextAuthOptions } from "next-auth";

const TENANT_SECRET = process.env.TENANT_SECRET!;

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async jwt({ token, profile, account }) {
      const onLoginEndpoint = `${process.env.PRIVATE_ORB_MODEL}/on_login`;
      // using `${process.env.NEXT_PUBLIC_ORB_MODEL}/on_login` causes the auth to get stuck

      if (account && profile && account.provider === "github") {
        const gh = profile as {
          login: string; // github_login
          id: number; // github_id
          email?: string;
          name?: string;
        };
        // TODO: add github_id to User state
        // console.log(gh.id);

        // NOTE: must explicitly add headers as we are not using NEXT_PUBLIC_ORB_MODEL
        const res = await fetch(onLoginEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-orb-internal": `${TENANT_SECRET}`,
            // "x-orb-github-id": String(gh.id),
          },
          body: JSON.stringify({
            github_login: gh.login,
            email: gh.email,
            name: gh.name,
          }),
        });
        if (!res.ok) throw new Error(`on_login failed: ${res.status} ${res.statusText}`);

        const data = await res.json();
        token.user_id = data.user_id; // UUID
        token.github_login = gh.login;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.user_id === "string") {
        session.user.user_id = token.user_id;
      }
      if (typeof token.github_login === "string") {
        session.user.github_login = token.github_login;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
