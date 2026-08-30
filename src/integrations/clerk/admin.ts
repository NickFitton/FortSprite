import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";

/**
 * Enforces the Clerk-backed administrator role at a server boundary.
 *
 * Reading the user object instead of trusting a client-provided value means a
 * public-metadata change takes effect immediately, without waiting for a
 * session-token refresh.
 */
export async function requireAdmin() {
  const access = await getAdminAccess();

  if (!access.isSignedIn) {
    throw new Response("Authentication required", { status: 401 });
  }

  if (!access.isAdmin) {
    throw new Response("Administrator access required", { status: 403 });
  }
}

async function getAdminAccess() {
  const { userId } = await auth();

  if (!userId) {
    return { isSignedIn: false, isAdmin: false };
  }

  const user = await clerkClient().users.getUser(userId);
  return {
    isSignedIn: true,
    isAdmin: user.publicMetadata.isAdmin === true,
  };
}

/** A server boundary for route guards that need to redirect non-admin users. */
export const checkAdminAccess = createServerFn({ method: "GET" }).handler(
  getAdminAccess,
);
