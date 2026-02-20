import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getAdminCookieName,
  getAdminSessionFromRequest,
} from "@/lib/admin-auth";
import { hashPassword } from "@/lib/password";
import prisma from "@/lib/prisma";
import { publishAdminPresenceEvent } from "@/lib/realtime";

type Params = { params: Promise<{ adminId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { adminId } = await params;
  if (!adminId) {
    return NextResponse.json({ error: "adminId is required" }, { status: 400 });
  }

  const body: unknown = await req.json();
  const name =
    typeof body === "object" && body !== null && "name" in body
      ? (body as { name?: unknown }).name
      : undefined;
  const password =
    typeof body === "object" && body !== null && "password" in body
      ? (body as { password?: unknown }).password
      : undefined;
  const active =
    typeof body === "object" && body !== null && "active" in body
      ? (body as { active?: unknown }).active
      : undefined;

  const updateData: {
    name?: string;
    password?: string;
    active?: boolean;
    isOnline?: boolean;
  } = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Nama minimal 2 karakter." },
        { status: 400 }
      );
    }
    updateData.name = name.trim();
  }

  if (password !== undefined) {
    if (typeof password !== "string" || password.trim().length < 4) {
      return NextResponse.json(
        { error: "Password minimal 4 karakter." },
        { status: 400 }
      );
    }
    updateData.password = await hashPassword(password.trim());
  }

  if (active !== undefined) {
    if (typeof active !== "boolean") {
      return NextResponse.json(
        { error: "active harus boolean." },
        { status: 400 }
      );
    }
    updateData.active = active;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "Tidak ada perubahan yang dikirim." },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, username: true, active: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Admin tidak ditemukan." },
        { status: 404 }
      );
    }

    if (updateData.active === false) {
      updateData.isOnline = false;
      if (existing.username === session.username) {
        return NextResponse.json(
          { error: "Akun sendiri tidak bisa dinonaktifkan." },
          { status: 400 }
        );
      }

      const activeCount = await prisma.adminUser.count({
        where: { active: true },
      });
      if (activeCount <= 1 && existing.active) {
        return NextResponse.json(
          { error: "Minimal harus ada 1 admin aktif." },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.adminUser.update({
      where: { id: adminId },
      data: updateData,
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

    const response = NextResponse.json({ item: updated });
    if (existing.username === session.username && updateData.name) {
      response.cookies.set({
        name: getAdminCookieName(),
        value: createAdminSessionToken(session.username, updateData.name),
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
    }

    return response;
  } catch (error) {
    console.error("Failed to update admin user:", error);
    return NextResponse.json(
      { error: "Failed to update admin user" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { adminId } = await params;
  if (!adminId) {
    return NextResponse.json({ error: "adminId is required" }, { status: 400 });
  }

  try {
    const existing = await prisma.adminUser.findUnique({
      where: { id: adminId },
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

    if (!existing) {
      return NextResponse.json(
        { error: "Admin tidak ditemukan." },
        { status: 404 }
      );
    }

    if (existing.username === session.username) {
      return NextResponse.json(
        { error: "Akun sendiri tidak bisa dihapus." },
        { status: 400 }
      );
    }

    if (existing.isOnline) {
      return NextResponse.json(
        { error: "Admin masih online. Minta logout dulu sebelum dihapus." },
        { status: 400 }
      );
    }

    const totalCount = await prisma.adminUser.count();
    if (totalCount <= 1) {
      return NextResponse.json(
        { error: "Minimal harus ada 1 admin tersisa." },
        { status: 400 }
      );
    }

    await prisma.adminUser.delete({
      where: { id: adminId },
    });

    // Emit an update marker so clients can react/reload if needed.
    publishAdminPresenceEvent({
      id: `presence:${existing.id}:deleted:${new Date().toISOString()}`,
      adminId: existing.id,
      username: existing.username,
      name: existing.name,
      active: false,
      isOnline: false,
      createdAt: existing.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete admin user:", error);
    return NextResponse.json(
      { error: "Failed to delete admin user" },
      { status: 500 }
    );
  }
}
