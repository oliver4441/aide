import { NextRequest, NextResponse } from "next/server";
import { requireUser, toAuthError } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Platform admin emails sign in against the Admin table (see lib/auth.ts);
// a regular user must not be able to take one of those addresses, or their
// next login would be routed to the admin credential check and fail.
function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || "kipkiruigideon890@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email);
}

/**
 * Update the signed-in user's own profile (name and/or email).
 *
 * The NextAuth JWT keeps carrying the old email until the client signs in
 * again, so the Settings UI signs the user out after a successful email
 * change.
 */
export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = await requireUser(request);

    if (sessionUser.role === "admin") {
      return NextResponse.json(
        { error: "Admin accounts cannot change their email here" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data: { name?: string; email?: string } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      data.name = name;
    }

    if (body.email !== undefined) {
      const email = String(body.email).toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
      }
      if (email === sessionUser.email) {
        return NextResponse.json({ error: "That is already your email" }, { status: 400 });
      }
      if (isAdminEmail(email)) {
        return NextResponse.json(
          { error: "That email is reserved. Please use a different one." },
          { status: 400 }
        );
      }
      const [userTaken, adminTaken] = await Promise.all([
        prisma.user.findUnique({ where: { email }, select: { id: true } }),
        prisma.admin.findUnique({ where: { email }, select: { id: true } }),
      ]);
      if (userTaken || adminTaken) {
        return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
      }
      data.email = email;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data,
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return toAuthError(err);
  }
}
