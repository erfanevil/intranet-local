import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { AUTH_SECRET } from "@/lib/auth/crypto";
import { SESSION_COOKIE, SESSION_TTL_SEC } from "@/lib/auth/constants";

export { SESSION_COOKIE };

const key = new TextEncoder().encode(AUTH_SECRET);

export interface SessionPayload {
  sub: string;
  phone: string;
  name: string;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ phone: payload.phone, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer("sefareshchi")
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(key);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, { issuer: "sefareshchi" });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      phone: String(payload.phone ?? ""),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

/** Write the httpOnly session cookie. */
export async function createSession(user: User): Promise<void> {
  const token = await signSessionToken({
    sub: String(user.id),
    phone: user.phone,
    name: `${user.firstName} ${user.lastName}`.trim(),
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Load the signed-in user from the database, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, Number(session.sub)))
    .limit(1);

  return user ?? null;
}
