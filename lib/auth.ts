// lib/auth.ts - helper utilities for password hashing and JWT session management
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role, RankTier } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";
const TOKEN_EXPIRY = "7d";

export type AuthTokenPayload = {
  sub: string;
  role: Role;
  rank: RankTier;
};

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthTokenPayload): string {
  try {
    return jwt.sign(
      {
        sub: payload.sub,
        role: String(payload.role),
        rank: String(payload.rank),
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
  } catch (err) {
    console.error("JWT sign error:", err);
    throw new Error("Failed to generate token");
  }
}

export function verifyToken(token?: string): AuthTokenPayload | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      role: string;
      rank: string;
    };
    const validRoles = Object.values(Role) as string[];
    const validRanks = Object.values(RankTier) as string[];
    if (!validRoles.includes(decoded.role)) {
      console.warn(`Invalid role in token: ${decoded.role}`);
      return null;
    }
    if (!validRanks.includes(decoded.rank)) {
      console.warn(`Invalid rank in token: ${decoded.rank}`);
      return null;
    }
    return {
      sub: decoded.sub,
      role: decoded.role as Role,
      rank: decoded.rank as RankTier,
    };
  } catch (err) {
    console.error("JWT verify error:", err);
    return null;
  }
}

export async function getAuthContextFromRequest(req: NextRequest) {
  const headerToken = req.headers.get("authorization") ?? req.headers.get("Authorization");
  const bearerToken = headerToken?.startsWith("Bearer ") ? headerToken.slice(7).trim() : undefined;
  const cookieToken = req.cookies.get("tanq_token")?.value;
  const token = bearerToken ?? cookieToken;
  const payload = verifyToken(token);
  if (!payload) {
    return { token: null, payload: null, user: null };
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  return { token, payload, user };
}

export function requireRole(payload: AuthTokenPayload | null, roles: Role[]) {
  if (!payload || !roles.includes(payload.role)) {
    throw new Error("FORBIDDEN");
  }
}

export function stripPassword<T extends { passwordHash?: unknown }>(entity: T): Omit<T, "passwordHash"> {
  const { passwordHash: _omit, ...safe } = entity;
  void _omit;
  return safe;
}
