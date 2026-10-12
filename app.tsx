// Herdr-style thread tabs, injected above the thread header.
//
// HACK: bb has no slot for a region above the chat. experimental_threadHeaderAction
// mounts once per pane with that pane's threadId, *inside* the header. We render
// an invisible anchor there, walk up to the <header>, insert a sibling <div>
// before it, and portal the tab row into that div. Tabs are the thread's
// siblings: same environment (a "workspace"), or same project when it has none.
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isListed, STATUS, statusOf, workspaceKey } from "./status";
import { InlineTitle } from "./InlineTitle";
import { WorkspaceSidebar } from "./Sidebar";
import { ThreadMenu } from "./ThreadMenu";
import {
  definePluginApp,
  experimental_useSidebarThreads as useSidebarThreads,
  useBbNavigate,
  useSdk,
  type PluginSidebarThread,
  type PluginThreadHeaderActionProps,
} from "@get-bb/plugin-sdk/app";

function TabRow({ threadId }: { threadId: string }) {
  const { threads } = useSidebarThreads();
  const navigate = useBbNavigate();
  const sdk = useSdk();
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const current = threads.find((thread) => thread.id === threadId);
  const tabs = useMemo(() => {
    if (!current) return [];
    const key = workspaceKey(current);
    return threads
      .filter(
        (thread) =>
          isListed(thread) && workspaceKey(thread) === key,
      )
      .sort((a, b) => a.createdAt - b.createdAt); // stable order, not status
  }, [threads, current]);

  if (!current || tabs.length === 0) return null;
  const environmentId = current.environment?.id ?? undefined;

  return (
    <div
      role="tablist"
      aria-label="Workspace threads"
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 4,
        padding: "6px 8px 0",
        overflowX: "auto",
        borderBottom: "1px solid var(--border, #313244)",
        fontSize: 13,
      }}
    >
      {tabs.map((thread) => {
        const status = STATUS[statusOf(thread)];
        const active = thread.id === threadId;
        const tabStyle = {
          display: "flex",
          alignItems: "center",
          gap: 6,
          maxWidth: 220,
          padding: "5px 10px",
          borderRadius: "8px 8px 0 0",
          border: "1px solid",
          borderColor: active ? "var(--border, #313244)" : "transparent",
          borderBottom: "none",
          background: active ? "var(--background, #1e1e2e)" : "transparent",
          color: active ? "inherit" : "var(--muted-foreground, #a6adc8)",
          fontWeight: 600,
          cursor: "pointer",
        };
        const glyph = (
          <span
            aria-hidden
            style={{
              color: status.color,
              width: 14,
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            {status.glyph}
          </span>
        );
        // An <input> inside a <button> swallows space and clicks, so a renaming tab is a div.
        if (thread.id === renamingId) {
          return (
            <div key={thread.id} role="tab" aria-selected={active} style={tabStyle}>
              {glyph}
              <InlineTitle
                initial={thread.displayTitle}
                style={{ width: 150 }}
                onDone={(title) => {
                  setRenamingId(null);
                  if (title) void sdk.threads.update({ threadId: thread.id, title });
                }}
              />
            </div>
          );
        }
        return (
          <ThreadMenu key={thread.id} thread={thread} onRename={setRenamingId}>
          <button
            type="button"
            role="tab"
            aria-selected={active}
            title={`${thread.displayTitle} — ${status.label}`}
            onClick={() => navigate.toThread(thread.id)}
            style={tabStyle}
          >
            {glyph}
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {thread.displayTitle}
            </span>
            {thread.isPinned ? (
              <span role="img" aria-label="Pinned" style={{ fontSize: 10 }}>
                📌
              </span>
            ) : null}
          </button>
          </ThreadMenu>
        );
      })}
      <button
        type="button"
        aria-label="New thread in this workspace"
        title="New thread in this workspace"
        onClick={() =>
          navigate.toCompose({
            projectId: current.projectId,
            environmentId,
            focusPrompt: true,
          })
        }
        style={{
          padding: "5px 10px",
          background: "transparent",
          border: "none",
          color: "var(--muted-foreground, #a6adc8)",
          cursor: "pointer",
        }}
      >
        +
      </button>
    </div>
  );
}

function ThreadTabsAnchor({ threadId }: PluginThreadHeaderActionProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const header = anchorRef.current?.closest("header");
    const parent = header?.parentElement;
    if (!header || !parent) return;
    // No primary-pane flag in the SDK; only the leftmost header gets a tab row so a split doesn't duplicate it.
    const isPrimaryPane = document.querySelectorAll("header")[0] === header;
    if (!isPrimaryPane) return;
    const host = document.createElement("div");
    host.dataset.herdrTabs = threadId;
    host.style.flexShrink = "0";
    parent.insertBefore(host, header);
    setContainer(host);
    return () => {
      host.remove();
      setContainer(null);
    };
  }, [threadId]);

  return (
    <>
      <span ref={anchorRef} hidden />
      {container ? createPortal(<TabRow threadId={threadId} />, container) : null}
    </>
  );
}

export default definePluginApp((app) => {
  app.slots.experimental_threadList({
    id: "herdr-workspaces",
    title: "Herdr workspaces",
    description: "Workspaces (environments) with rolled-up status, plus a flat priority-sorted Agents list.",
    component: WorkspaceSidebar,
  });
  app.slots.experimental_threadHeaderAction({
    id: "herdr-thread-tabs",
    title: "Workspace thread tabs",
    component: ThreadTabsAnchor,
  });
});
