import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { db } from '@/lib/db';
import { users, orgMemberships, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
        // Look up org membership
        const [membership] = await db
          .select({
            orgId: orgMemberships.orgId,
            role: orgMemberships.role,
            orgName: organizations.name,
            orgSlug: organizations.slug,
            plan: organizations.plan,
          })
          .from(orgMemberships)
          .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
          .where(eq(orgMemberships.userId, user.id))
          .limit(1);

        if (membership) {
          token.orgId = membership.orgId;
          token.orgRole = membership.role;
          token.orgName = membership.orgName;
          token.orgSlug = membership.orgSlug;
          token.plan = membership.plan;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.orgId = token.orgId as string;
        session.user.orgRole = token.orgRole as string;
        session.user.orgName = token.orgName as string;
        session.user.plan = token.plan as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        // Check if user exists already
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);

        if (!existing) {
          // Auto-create user + org for Google OAuth
          const slug =
            user.email
              .split('@')[0]
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, '-') + '-org';
          const [newOrg] = await db
            .insert(organizations)
            .values({ name: `${user.name}'s Org`, slug })
            .returning();
          const [newUser] = await db
            .insert(users)
            .values({
              email: user.email,
              name: user.name || user.email.split('@')[0],
              avatarUrl: user.image,
              emailVerified: true,
            })
            .returning();
          await db.insert(orgMemberships).values({
            userId: newUser.id,
            orgId: newOrg.id,
            role: 'owner',
          });
        }
      }
      return true;
    },
  },
});

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      orgId: string;
      orgRole: string;
      orgName: string;
      plan: string;
    };
  }
}

// JWT properties are accessed via token.xxx in callbacks above.
// TypeScript knows about them through the callback context.
// If stricter typing is needed, use a separate .d.ts with
// module augmentation for "@auth/core/jwt".
