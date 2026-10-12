import type { ReactNode } from "react";
import {
  experimental_ThreadActionsContextMenu as ThreadActionsContextMenu,
  type PluginSidebarThread,
  type PluginThreadActionTarget,
} from "@get-bb/plugin-sdk/app";

function toTarget(thread: PluginSidebarThread): PluginThreadActionTarget {
  const { environment } = thread;
  return {
    id: thread.id,
    projectId: thread.projectId,
    parentThreadId: thread.parentThreadId,
    archivedAt: thread.archivedAt,
    pinnedAt: thread.pinnedAt,
    sectionId: thread.sectionId,
    isUnread: thread.isUnread,
    status: thread.status,
    environment: environment?.id
      ? { id: environment.id, path: environment.path }
      : null,
  };
}

export function ThreadMenu({
  thread,
  onRename,
  disabled,
  children,
}: {
  thread: PluginSidebarThread;
  onRename: (threadId: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <ThreadActionsContextMenu
      thread={toTarget(thread)}
      requestRename={onRename}
      disabled={disabled}
    >
      {children}
    </ThreadActionsContextMenu>
  );
}
