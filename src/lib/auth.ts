import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "lahijan-municipality-secret-2024"
);

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  position: string;
  isAdmin: boolean;
}

export async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    position: user.position,
    isAdmin: user.isAdmin,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as number,
      username: payload.username as string,
      displayName: payload.displayName as string,
      position: payload.position as string,
      isAdmin: payload.isAdmin as boolean,
    };
  } catch {
    return null;
  }
}
