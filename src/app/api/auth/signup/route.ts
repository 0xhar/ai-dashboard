import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users, organizations, orgMemberships } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { slugify } from '@/lib/utils';
import { withErrorHandler, successResponse } from '@/lib/api/response';
import { ValidationError } from '@/lib/api/errors';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  orgName: z.string().min(1).max(100),
});

export const POST = withErrorHandler(async (req: Request) => {
  const body = await req.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  const { email, password, name, orgName } = parsed.data;

  // Check if user already exists
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    throw new ValidationError('Email already in use');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const slug = slugify(orgName) || slugify(email.split('@')[0]);

  // Create user + org + membership in one go
  const [newOrg] = await db
    .insert(organizations)
    .values({ name: orgName, slug })
    .returning();

  const [newUser] = await db
    .insert(users)
    .values({ email, name, passwordHash })
    .returning();

  await db.insert(orgMemberships).values({
    userId: newUser.id,
    orgId: newOrg.id,
    role: 'owner',
  });

  return successResponse({ userId: newUser.id, orgId: newOrg.id }, 201);
});
