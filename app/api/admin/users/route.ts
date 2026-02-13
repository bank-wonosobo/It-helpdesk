import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.adminUser.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        username: true,
        name: true,
        active: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ items: users });
  } catch (error) {
    console.error("Failed to load admin users:", error);
    return NextResponse.json(
      { error: "Failed to load admin users" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const username =
    typeof body === "object" && body !== null && "username" in body
      ? (body as { username?: unknown }).username
      : undefined;
  const password =
    typeof body === "object" && body !== null && "password" in body
      ? (body as { password?: unknown }).password
      : undefined;
  const name =
    typeof body === "object" && body !== null && "name" in body
      ? (body as { name?: unknown }).name
      : undefined;

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof name !== "string"
  ) {
    return NextResponse.json(
      { error: "username, password, and name are required" },
      { status: 400 }
    );
  }

  const normalizedUsername = username.trim();
  const normalizedPassword = password.trim();
  const normalizedName = name.trim();

  if (
    normalizedUsername.length < 3 ||
    normalizedPassword.length < 4 ||
    normalizedName.length < 2
  ) {
    return NextResponse.json(
      { error: "Username/password/nama terlalu pendek." },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.adminUser.findUnique({
      where: { username: normalizedUsername },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Username admin sudah digunakan." },
        { status: 409 }
      );
    }

    const created = await prisma.adminUser.create({
      data: {
        username: normalizedUsername,
        password: normalizedPassword,
        name: normalizedName,
        active: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        active: true,
        createdAt: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create admin user:", error);
    return NextResponse.json(
      { error: "Failed to create admin user" },
      { status: 500 }
    );
  }
}
