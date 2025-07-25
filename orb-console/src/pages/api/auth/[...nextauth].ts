import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, profile, account }) {
      if (account && profile) {
        // Send to backend once at login to get user_id
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_ORB_MODEL}/on_login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              login: profile.login,
              email: profile.email,
              name: profile.name,
            }),
          },
        );

        const data = await res.json();
        token.user_id = data.user_id;
        token.login = profile.login;
      }

      return token;
    },
    async session({ session, token }) {
      session.user.user_id = token.user_id;
      session.user.login = token.login;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
