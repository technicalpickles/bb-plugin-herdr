# Handoff: Herdr-style Sidebar + Thread Tabs for bb

## Overview
A design concept for a bb (getbb.app) plugin that reskins bb's sidebar to match the
UX of [herdr](https://herdr.dev/) (a terminal-session/agent-orchestrator the author
uses): workspaces as a grouping of agent threads, status icons (working / idle /
blocked / done) that roll up from thread to workspace, a flat priority-sorted
"Agents" list for jumping straight to whatever needs attention, and the individual
threads within a workspace surfaced as a tab row above the chat instead of nested
rows in the sidebar.

This is a **concept + feasibility exploration**, not a scoped build yet. The open
question for the developer (see "Feasibility findings" below) is whether/how to
implement it, specifically around the tab-row-above-chat part.

## About the design file
`BB Herdr Sidebar.dc.html` is a **design reference** — a clickable HTML/JS prototype
built outside bb's actual codebase, standing in for bb's sidebar + thread view. It is
not code to copy into bb directly. The task is to recreate this UX inside bb's real
frontend (`apps/app`, React + bb's `shared-ui` component library), using bb's actual
plugin SDK and component primitives, not the inline styles / mock data in this file.

## Fidelity
**High-fidelity for layout, interaction, and color direction** — spacing, type
scale, the catppuccin mocha palette, and the click-through behavior (select
workspace → tab row updates → select tab → chat updates) are intentional and meant
to be matched closely. **Not fidelity for bb's actual visual system**: bb's own
`shared-ui` design tokens (colors, type, spacing) were not available to pull from in
this project, so the mock uses an explicit catppuccin mocha palette rather than bb's
real tokens. The developer should re-derive this using bb's real design tokens from
`packages/shared-ui`, keeping structure/interaction and adapting color literals.

## Feasibility findings (from reading github.com/get-bb/bb, main branch)

- **The sidebar is genuinely pluggable today.** bb has a real, working plugin
  (`plugins/thread-list`) that fully replaces the sidebar thread list via
  `app.slots.experimental_threadList({ id, title, description, component })`. The
  component receives `{ activeThreadId, isCompactViewport, onNavigate }` and reads
  bb's live thread/project data through the plugin SDK. A second slot,
  `app.slots.experimental_sidebarNavigation`, replaces the sidebar nav rows above the
  list the same way. **The "Workspaces" list and the flat priority-sorted "Agents"
  list in this design are realistic to build as an actual bb plugin on these two
  slots.** bb's existing `ThreadStatusGlyph.tsx` (in the built-in thread-list plugin)
  already encodes working/blocked/done/idle-ish states, so the status-rollup
  behavior isn't a stretch from what bb already does.
- **The tab row above the chat is NOT an existing public extension point.** bb's
  internal API audit doc (`docs/api_to_audit.md`) states that `experimental_threadList`
  and `experimental_sidebarNavigation` are the only two slots that let a plugin fully
  replace a UI area ("exclusive" full-replace slots). There is no public slot for the
  main thread/chat header area. Building the tab strip as designed would mean
  **forking or modifying bb's own thread view**, not writing an isolated plugin —
  a materially bigger lift with real upgrade/merge risk against upstream bb.
- **Practical implication / open decision for the developer:** either (a) scope the
  plugin to the sidebar only and fold the "tabs" concept back into the sidebar as
  nested rows under each workspace (fully pluggable, no core changes), or (b) pursue
  the tab-row-above-chat as a bb core change / new slot proposal upstream, or (c)
  fork bb's thread view component to inject the tab row, accepting the maintenance
  cost. The chat/message area itself (approval cards, composer, message list)
  should otherwise reuse bb's existing `apps/app` thread view components as-is —
  this design does not intend to replace that.

## Screens / Views (single screen, two states)

### Sidebar + workspace list
- **Purpose:** Browse workspaces (bb projects/environments) and jump to any
  individual agent thread across all of them.
- **Layout:** Fixed-width left column, 240px, full height, flex column.
  - Top bar (48px): bb icon (22×22, 6px radius) + "bb" wordmark (700 weight,
    14px) + "Agentic IDE" label (12px, muted) on the left; a plugin-status pill
    ("Herdr Sidebar plugin · enabled", 11.5px, green dot + green text) on the right.
  - "Workspaces" section header (11px, uppercase, letter-spacing .06em, muted),
    then one row per workspace: icon (rolled-up status) + workspace name (13px/600),
    then a second line indented 19px with a branch pill (11px, muted bg) + agent
    count (e.g. "2 agents", pluralized).
  - "Agents" section header, then one row per active thread across all
    workspaces: icon + agent name (13px/600) + workspace name (11.5px, muted) on
    one line; optional second line (toggleable) with a short status caption
    ("bash approval", "idle 14m", etc).
  - Footer (pinned bottom): command-palette hint — two small monospace key chips
    ("⌃Space", "⌥P") + "Command Palette" label (11px, muted).
  - Selected row (workspace or agent): background `#313244`, 1px border `#45475a`,
    8px/7px border-radius.
- **Components:** workspace row, agent row, section header, key-chip, status pill.

### Thread tabs + chat
- **Purpose:** Switch between the agent threads that belong to the selected
  workspace, and converse with the active one.
- **Layout:** Flex column filling the remaining width.
  - Tab row (padding 8px 12px 0, border-bottom): one tab per agent in the selected
    workspace. Active tab: bg `#1e1e2e`, border `#313244` on 3 sides, no bottom
    border (sits flush with the panel below), text `#cdd6f4`. Inactive tab: no
    background/border, text `#a6adc8`. Each tab: status icon + agent name (13px/600)
    + optional status caption (11px, muted).
  - Thread header (44px): workspace name + branch pill on the left, status word
    (capitalized, colored by status) on the right.
  - Message list (flex:1, scroll, 18px/20px padding, 14px gap): agent text (13.5px,
    1.5 line-height), tool-call lines (12px, muted, with a small bullet), and an
    approval card for bash commands (see below).
  - Composer (bottom, 14px/20px padding): rounded input shell (`#181825` bg,
    `#313244` border, 10px radius) with placeholder text ("Message {agent}…") and a
    mauve "Send" pill button.
- **Approval card:** `#181825` bg, `#313244` border, 10px radius, 14px padding.
  "Bash command approval" label (12px/600, peach `#fab387`). Command rendered in a
  monospace block (`#11111b` bg, 6px radius). Description text (12px, muted). Two
  buttons: "Allow" (green fill `#a6e3a1`, dark text) and "Deny" (outlined, muted).

## Interactions & behavior
- Clicking a **workspace** row selects that workspace, switches the tab row to its
  agents, and auto-selects that workspace's first agent (its highest-priority one).
- Clicking an **agent** row in the flat "Agents" list jumps directly to that
  agent's workspace + tab, bypassing manual workspace browsing.
- Clicking a **tab** switches the active agent within the current workspace without
  changing the selected workspace.
- No animation/transition was designed — state changes are instant in the mock.
  Recommend standard bb list-selection transition timing when implemented.
- Workspace and tab order are **stable** (creation/pane order) — status is only
  rolled up visually (a workspace shows its most-urgent agent's icon/color), it does
  not reorder the workspace list. Confirmed against herdr's own docs
  (`State rollups`: "the sidebar rolls state upward" — it does not say workspaces
  resort).
- Only the flat "Agents" list is priority-sorted, matching herdr's real
  `agent_panel_sort = "priority"` config option (attention queue:
  blocked → done → working → idle).

## Tweakable knobs already modeled in the prototype
These map directly onto real herdr config options, and are implemented as live
props in the DC file (tweakable in the Tweaks panel):
- `sortMode`: `"priority"` | `"alphabetical"` — sorts the flat Agents list.
- `iconStyle`: `"symbols"` (●○◉●, color + shape per status) | `"dot"` (●, color
  only) — maps to herdr's `status_indicators` setting.
- `showTabRow`: boolean — show/hide the secondary caption line under sidebar
  Agent rows and tab captions — maps to herdr's `ui.sidebar.agents.rows` concept
  (`[["state_icon","workspace","agent"],["tab"]]`).

## Design tokens
Palette: Catppuccin Mocha (dark).
- Base/background: `#11111b` (crust, app shell) · `#181825` (mantle, sidebar/panels)
  · `#1e1e2e` (base, main panel/active tab)
- Surfaces/borders: `#313244` (surface0) · `#45475a` (surface1, selected border)
- Text: `#cdd6f4` (primary) · `#a6adc8` (subtext1) · `#7f849c` (subtext0, muted
  labels) · `#6c7086` (overlay0, captions/idle) · `#585b70` (overlay1, faint)
- Status colors: working `#89b4fa` (blue) · idle `#6c7086` (overlay0) · blocked
  `#f38ba8` (red) · done `#a6e3a1` (green)
- Accent: `#cba6f7` (mauve) — Send button, bb brand nod.
- Approval warning accent: `#fab387` (peach)

Typography: Inter (400/500/600/700) for all UI chrome, per the author's choice to
keep bb's existing UI font rather than go full-monospace; JetBrains Mono for the
command-palette key chips and the literal shell command in approval cards only
(these are "code", not UI chrome).

Radii: 4px (small pills/chips) · 6–7px (buttons, input shell) · 8–10px (rows, tabs,
cards).

## Assets
- `bb-icon.png` — bb's own purple app icon, copied from the user-provided bb design
  asset bundle (`apple-touch-icon-purple.png`), used as-is in the top bar. No new
  assets were generated; no third-party (herdr) brand assets were used — only the
  UX pattern (status rollups, priority sort, grouping) was referenced, re-implemented
  with original bb-colored/catppuccin visuals.

## Files
- `BB Herdr Sidebar.dc.html` — the full interactive prototype (self-contained; open
  directly in a browser). Mock data (3 workspaces, 4 agents, hand-written transcripts)
  lives at the top of its `<script>` logic class — replace with bb's real thread/
  project data model when implementing.
