# bb-plugin-herdr

A [bb](https://getbb.app) plugin that reskins the sidebar to work like [herdr](https://herdr.dev/): agent threads grouped by workspace, with status that rolls up from thread to workspace.

**Prototype.** It works, it's rough, and it leans on bb's `experimental_*` plugin slots.

## What it does

- **Workspaces** list, in stable order, each showing its most urgent agent's status.
- Flat **Agents** list sorted by attention priority: blocked, done, working, idle.
- Right-click context menu on threads and inline rename in rows.
- Catppuccin Mocha palette (swap for bb's own tokens if bb exposes them to plugins).

The tab-row-above-chat from the original design isn't a public bb extension point, so it isn't built. See [`design/`](design/) for the concept and feasibility notes.

## Install

Needs bb >= 0.45 and plugin SDK >= 0.6.15.

```sh
npm install
npx tsc --noEmit
```

Then load the directory as a local plugin in bb (see bb's plugin authoring docs).

## Layout

| File | Role |
|------|------|
| `app.tsx` | Registers the sidebar slot |
| `Sidebar.tsx` | Workspaces and Agents lists |
| `status.ts` | Status model, priority, palette |
| `ThreadContextMenu.tsx`, `InlineTitle.tsx` | Thread actions |
| `server.ts` | Stub (bb requires a server entry) |

## License

MIT
