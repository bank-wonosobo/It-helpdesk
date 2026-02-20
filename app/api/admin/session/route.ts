import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getAdminCookieName,
  getAdminSessionFromRequest,
  validateAdminCredentials,
} from "@/lib/admin-auth";
import { hashPassword } from "@/lib/password";
import prisma from "@/lib/prisma";
import { publishAdminPresenceEvent } from "@/lib/realtime";

export async function GET(req: Request) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: session.name,
    username: session.username,
    role: session.role,
  });
}

export async function POST(req: Request) {
  const body: unknown = await req.json();
  const username =
    typeof body === "object" && body !== null && "username" in body
      ? (body as { username?: unknown }).username
      : undefined;
  const password =
    typeof body === "object" && body !== null && "password" in body
      ? (body as { password?: unknown }).password
      : undefined;

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "username and password are required" },
      { status: 400 }
    );
  }

  const admin = await validateAdminCredentials(username, password);
  if (!admin) {
    return NextResponse.json(
      { error: "invalid credentials" },
      { status: 401 }
    );
  }

  const updated = await prisma.adminUser.update({
    where: { username: admin.username },
    data: {
      isOnline: true,
      ...(admin.needsPasswordRehash
        ? { password: await hashPassword(password) }
        : {}),
    },
    select: {
      id: true,
      username: true,
      name: true,
      active: true,
      isOnline: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  publishAdminPresenceEvent({
    id: `presence:${updated.id}:${updated.updatedAt.toISOString()}`,
    adminId: updated.id,
    username: updated.username,
    name: updated.name,
    active: updated.active,
    isOnline: updated.isOnline,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });

  const response = NextResponse.json({
    authenticated: true,
    user: admin.name,
    username: admin.username,
    role: "admin",
  });
  response.cookies.set({
    name: getAdminCookieName(),
    value: createAdminSessionToken(admin.username, admin.name),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}

export async function DELETE(req: Request) {
  const session = getAdminSessionFromRequest(req);
  const response = NextResponse.json({ ok: true });
  if (session) {
    try {
      const updated = await prisma.adminUser.update({
        where: { username: session.username },
        data: { isOnline: false },
        select: {
          id: true,
          username: true,
          name: true,
          active: true,
          isOnline: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      publishAdminPresenceEvent({
        id: `presence:${updated.id}:${updated.updatedAt.toISOString()}`,
        adminId: updated.id,
        username: updated.username,
        name: updated.name,
        active: updated.active,
        isOnline: updated.isOnline,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
    } catch {
      // Keep logout idempotent even if user record no longer exists.
    }
  }
  response.cookies.set({
    name: getAdminCookieName(),
    value: "",
    path: "/",
    maxAge: 0,
  });
  return response;
}
