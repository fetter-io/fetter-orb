// import NextAuth from "next-auth";
// import GitHubProvider from "next-auth/providers/github";

// export default NextAuth({
//   providers: [
//     GitHubProvider({
//       clientId: process.env.GITHUB_CLIENT_ID!,
//       clientSecret: process.env.GITHUB_CLIENT_SECRET!,
//     }),
//   ],
//   secret: process.env.NEXTAUTH_SECRET,
// });

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
      // Store extra info during login
      if (account && profile) {
        token.login = profile.login;
        // token.github_id = profile.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Add it to session.user so the client can access it
      (session.user as any).login = token.login;
      // (session.user as any).github_id = token.github_id;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
