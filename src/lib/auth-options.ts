import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { ADMIN_PASSWORD, ADMIN_USERNAME, ensureAdminUser } from "@/lib/admin";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || "noreply@example.com";

function createTransporter() {
  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("SMTP configuration is missing. Check SMTP_* env vars.");
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request",
  },
  providers: [
    CredentialsProvider({
      name: "Admin Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username ?? "";
        const password = credentials?.password ?? "";
        if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
          return null;
        }

        const admin = await ensureAdminUser();
        return {
          id: admin.id,
          name: admin.name,
          email: admin.email,
        };
      },
    }),
    EmailProvider({
      server: {
        host: smtpHost,
        port: smtpPort,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      },
      from: smtpFrom,
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const transport = createTransporter();
        const host = new URL(url).host;
        const result = await transport.sendMail({
          to: identifier,
          from: provider.from ?? smtpFrom,
          subject: `Sign in to ${host}`,
          text: `Sign in to ${host}\n${url}\n\n`,
          html: `<p>Sign in to <strong>${host}</strong></p><p><a href="${url}">Click here to sign in</a></p>`,
        });

        const failed = result.rejected.concat(result.pending).filter(Boolean);
        if (failed.length) {
          throw new Error(`Unable to send verification email to: ${failed.join(", ")}`);
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.id) return true;
      await prisma.wallet.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};
