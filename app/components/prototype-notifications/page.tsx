/**
 * PROTOTYPE — dispatch for the notifications page.
 *
 * Plan: three structurally different takes on the same page, switchable via
 * `?variant=`, all rendered inside the real app shell with fake data.
 */

import type { UserRole } from "~/db/schema";
import { feedKeyFor } from "./data";
import { usePrototypeParams } from "./params";
import { PageA } from "./variant-a";
import { PageB } from "./variant-b";
import { PageC } from "./variant-c";
import { PrototypeSwitcher } from "./switcher";

export function PrototypeNotificationsPage({
  role,
  isTeamAdmin,
}: {
  role: UserRole | null;
  isTeamAdmin: boolean;
}) {
  const params = usePrototypeParams();
  const feedKey = feedKeyFor(role, isTeamAdmin);

  if (!feedKey) {
    return (
      <div className="relative flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
        Select a user in the DevUI panel to see their notifications.
        <PrototypeSwitcher role={role} isTeamAdmin={isTeamAdmin} />
      </div>
    );
  }

  return (
    <>
      {params.variant === "b" ? (
        <PageB feedKey={feedKey} params={params} />
      ) : params.variant === "c" ? (
        <PageC feedKey={feedKey} params={params} />
      ) : (
        <PageA feedKey={feedKey} params={params} />
      )}
      <PrototypeSwitcher role={role} isTeamAdmin={isTeamAdmin} />
    </>
  );
}
