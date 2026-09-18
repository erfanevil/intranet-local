import { NextRequest } from "next/server";
import { verifyToken, type AuthUser } from "./auth";

export async function getAuthFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  
  if (!token) {
    return null;
  }

  return verifyToken(token);
}
