import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";

// Wrap PrismaAdapter so we always provide a password value for new users.
// This is required because the Prisma `User` model has a non-nullable `password` field,
// but OAuth users don't actually use it for authentication.
const baseAdapter = PrismaAdapter(prisma) as Adapter;

const adapter: Adapter = {
  ...baseAdapter,
  async createUser(data: any) {
    return (baseAdapter as any).createUser({
      ...data,
      // Ensure the password field is set for OAuth-created users.
      password: (data as any).password ?? randomUUID(),
    });
  },
};

export const authOptions: NextAuthOptions = {
  adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "you@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
  },
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getServerAuthSession();
  return session?.user ?? null;
}

