import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

export type AgentStatus = "blocked" | "working" | "done" | "idle";

// Catppuccin mocha from the design handoff; swap for bb tokens upstream.
export const STATUS: Record<
  AgentStatus,
  { glyph: string; color: string; label: string }
> = {
  blocked: { glyph: "◉", color: "#f38ba8", label: "Blocked" },
  working: { glyph: "◐", color: "#89b4fa", label: "Working" },
  done: { glyph: "●", color: "#a6e3a1", label: "Done" },
  idle: { glyph: "○", color: "#6c7086", label: "Idle" },
};

/** Herdr's attention queue: blocked → done → working → idle. Lower sorts first. */
export const STATUS_PRIORITY: Record<AgentStatus, number> = {
  blocked: 0,
  done: 1,
  working: 2,
  idle: 3,
};

export function statusOf(thread: PluginSidebarThread): AgentStatus {
  if (
    thread.hasPendingInteraction ||
    thread.indicator === "waiting-for-input" ||
    thread.indicator === "unread-error"
  ) {
    return "blocked";
  }
  if (
    thread.status === "starting" ||
    thread.status === "active" ||
    thread.runtimeStatus === "provisioning"
  ) {
    return "working";
  }
  if (thread.indicator === "unread-success") return "done";
  return "idle";
}

export function mostUrgent(statuses: readonly AgentStatus[]): AgentStatus {
  return statuses.reduce<AgentStatus>(
    (best, status) =>
      STATUS_PRIORITY[status] < STATUS_PRIORITY[best] ? status : best,
    "idle",
  );
}

/** A "workspace" is an environment; threads without one fall back to their project. */
export function workspaceKey(thread: PluginSidebarThread): string {
  return thread.environment?.id ?? `project:${thread.projectId}`;
}

export function isListed(thread: PluginSidebarThread): boolean {
  return !thread.isArchived && !thread.isHidden;
}
