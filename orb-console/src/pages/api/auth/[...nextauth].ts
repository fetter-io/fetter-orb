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
      const onLoginEndpoint = `${process.env.PRIVATE_ORB_MODEL}/on_login`;
      // using this causes the auth to get stuck
      // const onLoginEndpoint = `${process.env.NEXT_PUBLIC_ORB_MODEL}/on_login`;

      if (account && profile && account.provider === "github") {
        const githubProfile = profile as {
          login: string;
          id: number;
          email?: string;
          name?: string;
        };
        const res = await fetch(onLoginEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            login: githubProfile.login,
            email: githubProfile.email,
            name: githubProfile.name,
          }),
        });
        const data = await res.json();
        token.user_id = data.user_id;
        token.login = githubProfile.login;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.user_id === "number") {
        session.user.user_id = token.user_id;
      }
      if (typeof token.login === "string") {
        session.user.login = token.login;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
