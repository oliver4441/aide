import { NextResponse } from "next/server";
import { permissionMatrix } from "@/lib/platformAdmin.mjs";
import { platformErrorResponse, requirePlatformAdmin } from "@/lib/platformAuth";

export const dynamic = "force-dynamic";

/**
 * Identity and effective permissions for the console shell. The UI uses this
 * to hide controls it knows will be rejected; the API re-checks every action.
 */
export async function GET() {
  try {
    const { admin, permissions } = await requirePlatformAdmin();
    return NextResponse.json({
      admin,
      permissions,
      matrix: permissionMatrix(),
    });
  } catch (err) {
    return platformErrorResponse(err);
  }
}
