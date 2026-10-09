// Herdr-style sidebar: Workspaces (environments, stable order, rolled-up
// status) and a flat Agents list sorted by attention priority.
import { useMemo, useState } from "react";
import {
  experimental_useSidebarThreadActions as useSidebarThreadActions,
  experimental_useSidebarThreads as useSidebarThreads,
  type PluginSidebarThread,
  type PluginThreadListProps,
} from "@get-bb/plugin-sdk/app";
import {
  isListed,
  mostUrgent,
  STATUS,
  STATUS_PRIORITY,
  statusOf,
  workspaceKey,
  type AgentStatus,
} from "./status";
import { InlineTitle } from "./InlineTitle";
import { ThreadContextMenu, type ThreadMenuPosition } from "./ThreadContextMenu";

const IDLE_AGENTS_SHOWN = 10;

interface Workspace {
  key: string;
  name: string;
  branch: string | null;
  threads: PluginSidebarThread[];
  status: AgentStatus;
  createdAt: number;
}

const byPriority = (a: PluginSidebarThread, b: PluginSidebarThread) =>
  STATUS_PRIORITY[statusOf(a)] - STATUS_PRIORITY[statusOf(b)] ||
  b.updatedAt - a.updatedAt;

function SectionHeader({ children }: { children: string }) {
  return (
    <div
      style={{
        padding: "12px 12px 6px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--muted-foreground, #7f849c)",
      }}
    >
      {children}
    </div>
  );
}

function rowStyle(selected: boolean) {
  return {
    display: "block",
    width: "calc(100% - 16px)",
    margin: "0 8px 2px",
    padding: "7px 10px",
    textAlign: "left" as const,
    textDecoration: "none",
    color: "inherit",
    cursor: "pointer",
    borderRadius: 8,
    border: "1px solid",
    borderColor: selected ? "var(--border, #45475a)" : "transparent",
    background: selected ? "var(--accent, #313244)" : "transparent",
  };
}

const ellipsis = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
};

const mutedLine = {
  fontSize: 11.5,
  color: "var(--muted-foreground, #7f849c)",
};

function Glyph({ status }: { status: AgentStatus }) {
  const { glyph, color, label } = STATUS[status];
  return (
    <span
      role="img"
      aria-label={label}
      style={{ color, flexShrink: 0, width: 14, textAlign: "center" }}
    >
      {glyph}
    </span>
  );
}

function PinGlyph() {
  return (
    <span
      role="img"
      aria-label="Pinned"
      style={{ color: "var(--muted-foreground, #7f849c)", flexShrink: 0, fontSize: 11 }}
    >
      📌
    </span>
  );
}

export function WorkspaceSidebar({
  activeThreadId,
  onNavigate,
}: PluginThreadListProps) {
  const { threads, projects } = useSidebarThreads();
  const actions = useSidebarThreadActions();
  const [menu, setMenu] = useState<ThreadMenuPosition | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const { workspaces, agents } = useMemo(() => {
    const projectNames = new Map(projects.map((p) => [p.id, p.name]));
    const groups = new Map<string, PluginSidebarThread[]>();
    for (const thread of threads.filter(isListed)) {
      const key = workspaceKey(thread);
      groups.set(key, [...(groups.get(key) ?? []), thread]);
    }
    const workspaces: Workspace[] = [...groups.entries()].map(
      ([key, members]) => {
        const first = members[0]!;
        const env = first.environment;
        const projectName = projectNames.get(first.projectId) ?? "Workspace";
        // Project checkouts have no environment name, so the project is the
        // workspace; only a worktree gets its own name.
        const name = env?.isWorktree
          ? (env.name ?? env.branchName ?? projectName)
          : projectName;
        return {
          key,
          name,
          branch: env?.branchName && env.branchName !== name ? env.branchName : null,
          threads: [...members].sort((a, b) => a.createdAt - b.createdAt),
          status: mostUrgent(members.map(statusOf)),
          createdAt: Math.min(...members.map((t) => t.createdAt)),
        };
      },
    );
    workspaces.sort((a, b) => a.createdAt - b.createdAt); // stable, never by status

    const sorted = threads.filter(isListed).sort(byPriority);
    let idleSeen = 0;
    const agents = sorted.filter(
      (t) => statusOf(t) !== "idle" || ++idleSeen <= IDLE_AGENTS_SHOWN,
    );
    return { workspaces, agents };
  }, [threads, projects]);

  const workspaceNames = new Map(workspaces.flatMap((w) =>
    w.threads.map((t) => [t.id, w.name] as const),
  ));
  const activeWorkspaceKey = threads.find((t) => t.id === activeThreadId)
    ? workspaceKey(threads.find((t) => t.id === activeThreadId)!)
    : null;

  const open = (id: string) => {
    actions.open(id);
    onNavigate?.();
  };

  return (
    <nav aria-label="Workspaces and agents" style={{ paddingBottom: 12 }}>
      <SectionHeader>Workspaces</SectionHeader>
      {workspaces.map((workspace) => {
        const target = [...workspace.threads].sort(byPriority)[0]!;
        return (
          <button
            key={workspace.key}
            type="button"
            onClick={() => open(target.id)}
            style={rowStyle(workspace.key === activeWorkspaceKey)}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Glyph status={workspace.status} />
              <span style={{ ...ellipsis, fontSize: 13, fontWeight: 600 }}>
                {workspace.name}
              </span>
            </div>
            <div style={{ ...mutedLine, paddingLeft: 19, display: "flex", gap: 6 }}>
              {workspace.branch ? (
                <span
                  style={{
                    ...ellipsis,
                    maxWidth: 110,
                    padding: "0 5px",
                    borderRadius: 4,
                    background: "var(--muted, #313244)",
                  }}
                >
                  {workspace.branch}
                </span>
              ) : null}
              <span>
                {workspace.threads.length}{" "}
                {workspace.threads.length === 1 ? "agent" : "agents"}
              </span>
            </div>
          </button>
        );
      })}

      <SectionHeader>Agents</SectionHeader>
      {agents.map((thread) => {
        const status = statusOf(thread);
        if (thread.id === renamingId) {
          return (
            <div key={thread.id} style={rowStyle(thread.id === activeThreadId)}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Glyph status={status} />
                <InlineTitle
                  initial={thread.displayTitle}
                  style={{ fontSize: 13, fontWeight: 600 }}
                  onDone={(title) => {
                    setRenamingId(null);
                    if (title) void actions.rename(thread.id, title);
                  }}
                />
              </div>
            </div>
          );
        }
        return (
          <a
            key={thread.id}
            href={thread.href}
            data-sidebar-thread-shortcut-target=""
            data-sidebar-thread-id={thread.id}
            onClick={(event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey
              ) {
                return;
              }
              event.preventDefault();
              open(thread.id);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              setMenu({ x: event.clientX, y: event.clientY, thread });
            }}
            style={rowStyle(thread.id === activeThreadId)}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Glyph status={status} />
              {thread.isPinned ? <PinGlyph /> : null}
              <span style={{ ...ellipsis, fontSize: 13, fontWeight: 600 }}>
                {thread.displayTitle}
              </span>
              <span style={{ ...ellipsis, ...mutedLine, marginLeft: "auto" }}>
                {workspaceNames.get(thread.id)}
              </span>
            </div>
            <div style={{ ...mutedLine, paddingLeft: 19 }}>
              {thread.indicatorLabel ?? STATUS[status].label}
            </div>
          </a>
        );
      })}
      {menu ? (
        <ThreadContextMenu
          position={menu}
          onClose={() => setMenu(null)}
          onRename={setRenamingId}
          currentThreadId={activeThreadId}
        />
      ) : null}
    </nav>
  );
}
