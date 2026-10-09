// Stand-in for the host's own row menu, which experimental_threadList replacements don't inherit.
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  experimental_Icon as Icon,
  experimental_useSidebarThreadActions as useSidebarThreadActions,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";

export interface ThreadMenuPosition {
  x: number;
  y: number;
  thread: PluginSidebarThread;
}

const iconStyle = { width: 14, height: 14, flexShrink: 0 };

const itemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "7px 12px",
  borderRadius: 6,
  background: "transparent",
  border: "none",
  textAlign: "left" as const,
  fontSize: 13,
  cursor: "pointer",
  color: "inherit",
};

const dangerStyle = { ...itemStyle, color: "#f38ba8" };

const separatorStyle = {
  height: 1,
  margin: "4px 0",
  background: "var(--border, #313244)",
};

function Item({
  icon,
  danger,
  onSelect,
  children,
}: {
  icon: string;
  danger?: boolean;
  onSelect: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      style={danger ? dangerStyle : itemStyle}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = "var(--accent, #313244)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = "transparent";
      }}
      onClick={onSelect}
    >
      <Icon name={icon} aria-hidden style={iconStyle} />
      {children}
    </button>
  );
}

export function ThreadContextMenu({
  position,
  onClose,
  currentThreadId,
  onRename,
}: {
  position: ThreadMenuPosition;
  onClose: () => void;
  onRename: (threadId: string) => void;
  /** The pane's own thread — open({split:true}) just focuses it, so hide "Open in split" for it. */
  currentThreadId?: string | null;
}) {
  const actions = useSidebarThreadActions();
  const menuRef = useRef<HTMLDivElement>(null);
  const { thread } = position;

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [onClose]);

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        minWidth: 190,
        padding: 4,
        borderRadius: 8,
        border: "1px solid var(--border, #313244)",
        background: "var(--popover, #181825)",
        color: "var(--popover-foreground, #cdd6f4)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        zIndex: 1000,
      }}
    >
      {thread.id !== currentThreadId ? (
        <Item icon="Columns2" onSelect={() => run(() => actions.open(thread.id, { split: true }))}>
          Open in split
        </Item>
      ) : null}
      <Item
        icon="Copy"
        onSelect={() => run(() => void navigator.clipboard.writeText(thread.href))}
      >
        Copy thread link
      </Item>
      <Item
        icon={thread.isUnread ? "Mail" : "MailOpen"}
        onSelect={() => run(() => void actions.setRead(thread.id, thread.isUnread))}
      >
        {thread.isUnread ? "Mark read" : "Mark unread"}
      </Item>
      <Item
        icon={thread.isPinned ? "PinOff" : "Pin"}
        onSelect={() => run(() => void actions.setPinned(thread.id, !thread.isPinned))}
      >
        {thread.isPinned ? "Unpin" : "Pin"}
      </Item>
      <Item icon="Edit" onSelect={() => run(() => onRename(thread.id))}>
        Rename
      </Item>
      <div style={separatorStyle} />
      <Item icon="Archive" onSelect={() => run(() => actions.archive(thread.id))}>
        Archive
      </Item>
      <Item icon="Trash2" danger onSelect={() => run(() => actions.requestDelete(thread.id))}>
        Delete
      </Item>
    </div>,
    document.body,
  );
}
