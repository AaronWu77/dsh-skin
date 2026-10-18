---
kind: package-reference
description: "Optional AW/STUDIO branding and Aurora glass-and-ink appearance for the customized RC2 Host."
---
# dsh-skin

English | [中文](README.zh.md)

## Summary

A reversible browser plugin for AW/STUDIO branding, Aurora colors, glass surfaces, and readable ink code cards. It does not change models, tools, authentication, permissions, Session data, or the conversation hero artwork.

## Installation

Build with `pnpm install --frozen-lockfile` and `pnpm run build`. Install as a profile bundle, not by editing an upstream bundle. The first Host migration requires the stopped-service procedure in [DEPLOY.md](DEPLOY.md); adding this plugin to the old customized Host duplicates some styles and uses a different brand scale.

The package targets DSH `0.2.1-rc.2` with its companion Host migration. Unmodified upstream RC2 supplies the brand slots and theme tokens but lacks several component selectors, so identical appearance there is not promised. The selector expectations are covered by [style-contract.spec.ts](tests/style-contract.spec.ts).

## Ownership and unloading

The browser entry owns one `style[data-dsh-skin-style]` node, the `html[data-dsh-skin="aaron"]` marker, and two sidebar brand-slot contributions at priority -100. Disabling removes those resources and restores the previous marker unless another owner changed it. A duplicate mounted entry fails rather than accumulating CSS. Another brand at the same priority conflicts; disable it or use a different priority.

Rules use semantic tokens and attributes, not CSS-module hashes, copied upstream components, DOM class discovery, or per-message observers. Native drag regions, footer layout, overlay safety, scrollbars, floating-pane collapse, and fullscreen geometry remain Host-owned.

## Development and hot reload

Run `pnpm run watch` after installation. It rebuilds the browser bundle; the running Web HMR receiver then replaces the plugin without restarting the Host or refreshing the page. Saving source without a successful rebuild does not update the GUI. Plugin-local React state can reset. Host shell or static-package changes still require a Host build and page refresh, and sometimes a restart.

## Model Experience

No prompts, tools, events, token accounting, or model-visible data are added. Model token use and KV-cache inputs are unchanged.

## Verification

- `pnpm run typecheck`: strict production and test typing.
- `pnpm test`: published SlotRegistry lifecycle, declaration ordering, repeated cleanup, CSS scoping, cascade, and rendering safety.
- `pnpm run build && pnpm run lint`: portable browser factory and publication checks.
- `pnpm run test:browser`: fresh, keyless shipped Web profile on an OS-assigned port, official CLI installation, enable/disable cleanup and source-watch browser replacement. Set `DSH_HOST_PATH` to a built companion Host; `DSH_BROWSER_CHANNEL` defaults to `chrome`. It never uses the active home or port 3080. Diagnostics remain in ignored `.local/`.

## Known Limitations and Deferred Work

AppFrame structural wrappers, native titlebar integration, functional overlay fixes, ToolRow expanded state, and StateDot remain companion Host changes. Disabling restores a neutral layout on that customized Host, not a byte-identical upstream app. Native macOS/Windows titlebars and every third-party plugin combination require separate acceptance. Future Host releases can rename tokens or selectors; rerun composition/browser checks before claiming compatibility.
