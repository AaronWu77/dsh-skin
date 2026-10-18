---
kind: package-bundle
description: "Optional AW/STUDIO branding and Aurora glass-and-ink appearance for the customized RC2 Host."
---
# dsh-skin

English | [中文](README.zh.md)

## Summary

A reversible browser plugin for AW/STUDIO branding, Aurora colors, glass surfaces, readable ink code cards, and a shared StateDot running glyph. It does not change models, tools, authentication, permissions, Session data, or the conversation hero artwork.

## Installation

Build with `pnpm install --frozen-lockfile --ignore-scripts` and `pnpm run build`. Install as a profile bundle, not by editing an upstream bundle. The first Host migration requires the stopped-service procedure in [DEPLOY.md](DEPLOY.md); adding this plugin to the old customized Host duplicates some styles and uses a different brand scale. An already migrated Host with this bundle installed uses that document’s regular-update guidance; do not repeat the first-migration installer or reinstall unrelated plugins.

The package targets DSH `0.2.1-rc.2` with its companion Host migration. Unmodified upstream RC2 supplies the brand slots and theme tokens but lacks several component selectors, so identical appearance there is not promised. The selector expectations are covered by [style-contract.spec.ts](tests/style-contract.spec.ts).

## Ownership and unloading

The browser entry owns one `style[data-dsh-skin-style]` node, the `html[data-dsh-skin="aaron"]` marker, two sidebar brand-slot contributions, and one `conversation.chat.flow.running.icon` contribution, all at priority -100. The running-icon injection is independent of brand declarations; it waits for its Host declaration and follows disappearance/redeclaration. Disabling removes those resources, restores the Host's priority-100 official whale, and restores the previous marker unless another owner changed it. A duplicate mounted entry fails rather than accumulating CSS. Another contribution in the same single slot at the same priority conflicts; disable it or use a different priority.

Rules use semantic tokens and attributes, not CSS-module hashes, copied upstream components, DOM class discovery, or per-message observers. The glyph returns the Host-shared `StateDot` with `state="ongoing"` and the owner-provided `className`; that class preserves content-font-scaled width/height, and a slot-scoped rule inherits text color. It adds no clock, state hooks, observers, or manual DOM. Chat still owns running state, elapsed time, localized text, live announcements, and mount lifetime. Shared spinner animation/reduced-motion behavior remains in ui-primitives. Native drag regions, footer layout, overlay safety, scrollbars, floating-pane collapse, and fullscreen geometry remain Host-owned.

Published npm RC2 ui-chat does not declare this customized Host slot. [companion-host.ts](src/client/companion-host.ts) therefore mirrors only its exact type-only `SlotMap` member: `{ kind: 'single'; scope: 'session'; owner: { readonly className: string | undefined } }`. It creates no runtime declaration, imports no broad Chat implementation, and uses no unsafe registration casts. Keep this mirror identical to the companion Host; [companion-host-types.ts](tests/companion-host-types.ts) checks that both declarations merge and preserve the exact owner shape. ui-primitives is a pinned build dependency and a Host-provided browser external, never bundled as a private spinner copy.

## Development and hot reload

Run `pnpm run watch` after installation to rebuild the browser bundle. Replacement without refresh also requires the active Web HMR receiver and `pnpm run dev:web` running from the same companion Host checkout to rebuild client-plugin bundles. Saving source without a successful rebuild does not update the GUI. Plugin-local React state can reset. Host shell or static-package changes still require a Host build and page refresh, and sometimes a restart.

## Model Experience

No prompts, tools, events, token accounting, or model-visible data are added. Model token use and KV-cache inputs are unchanged.

## Verification

- `pnpm run typecheck`: strict production and test typing.
- `pnpm test`: real published SlotRegistry lifecycle, late declarations, disappearance/redeclaration, brand independence, default priority/fallback, repeated cleanup, CSS scoping, cascade, and rendering safety. The Host-external StateDot is mocked only to check delegation; real primitive/browser integration belongs to the companion Host acceptance.
- `pnpm run build && pnpm run lint`: portable browser factory and publication checks.
- `pnpm run test:browser`: fresh, keyless shipped Web profile on an OS-assigned port, official CLI installation, enable/disable cleanup and source-watch browser replacement. Set `DSH_HOST_PATH` to a built companion Host; `DSH_BROWSER_CHANNEL` defaults to `chrome`. It never uses the active home or port 3080. Diagnostics remain in ignored `.local/`.

## Known Limitations and Deferred Work

AppFrame structural wrappers, native titlebar integration, functional overlay fixes, ToolRow expanded state, and the running-icon slot/default whale remain companion Host changes. Unmodified upstream RC2 has no running-icon declaration, so this contribution stays dormant there. Disabling restores a neutral layout on that customized Host, not a byte-identical upstream app. Native macOS/Windows titlebars and every third-party plugin combination require separate acceptance. Future Host releases can rename tokens or selectors; rerun composition/browser checks before claiming compatibility.
