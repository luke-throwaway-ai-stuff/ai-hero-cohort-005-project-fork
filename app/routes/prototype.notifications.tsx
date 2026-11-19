/**
 * PROTOTYPE — throwaway route. Never lands on main.
 *
 * Question: what should the in-app notification experience look and feel like
 * in today's shell? Three variants, switchable via `?variant=`, on one route.
 * Fake data, no provider, no persistence.
 *
 * /prototype/notifications?variant=a|b|c&count=auto|0|12|unknown&feed=items|allread|empty|error&open=0|1
 */

import { and, eq } from "drizzle-orm";
import type { Route } from "./+types/prototype.notifications";
import { db } from "~/db";
import { teamMembers, TeamMemberRole, users } from "~/db/schema";
import { getCurrentUserId } from "~/lib/session";
import { PrototypeNotificationsPage } from "~/components/prototype-notifications/page";

export async function loader({ request }: Route.LoaderArgs) {
  const currentUserId = await getCurrentUserId(request);
  if (!currentUserId) return { role: null, isTeamAdmin: false };

  const user = db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, currentUserId))
    .get();

  const membership = db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.userId, currentUserId),
        eq(teamMembers.role, TeamMemberRole.Admin)
      )
    )
    .get();

  return {
    role: user?.role ?? null,
    isTeamAdmin: !!membership,
  };
}

export default function PrototypeNotifications({
  loaderData,
}: Route.ComponentProps) {
  return (
    <PrototypeNotificationsPage
      role={loaderData.role}
      isTeamAdmin={loaderData.isTeamAdmin}
    />
  );
}
