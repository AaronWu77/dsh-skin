---
kind: package-bundle
description: "Optional AW/STUDIO branding and Aurora glass-and-ink appearance for the customized rc4 host."
---
# dsh-skin

English | [中文](README.zh.md)

<a id="plugin-information"></a>
## Plugin information

Apply reversible AW/STUDIO branding, Aurora colors, and glass surfaces.

| Field | Value |
|---|---|
| Package | `dsh-skin` |
| Checkout version | `0.1.2-rc4.7` |
| Maintained repository | [AaronWu77/dsh-skin](https://github.com/AaronWu77/dsh-skin) |
| Package license | MIT |

Package identity, license and upstream declarations are maintained in [package.json](package.json). A checkout version does not establish a published release or verified compatibility; retain the existing qualification and deployment limits below.

<a id="source-and-attribution"></a>
## Source and attribution

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — adapted implementation; MIT; exact upstream baseline not recorded. Extract customized presentation styles into a reversible branding and appearance plugin. [Detailed record](https://github.com/AaronWu77/dsh-skin/blob/HEAD/THIRD_PARTY_NOTICES.md).

The maintained fork and the upstream project are different repositories. Original author, copyright, license and notice statements remain in force. A missing upstream baseline is left unrecorded rather than inferred from the local version.

## Summary

A reversible browser plugin for AW/STUDIO branding, Aurora colors, glass surfaces, readable ink code cards, and a pulsing running indicator. It does not change models, tools, authentication, permissions, Session data, or the conversation hero artwork.

The **AW Studio** Settings section controls the palette, pointer trails, and trail strength when the Host serves the `dsh-skin` settings. The Settings controls accept finite trail strength values from 0.2 to 1. An existing invalid value is preserved; the appearance uses 0.62 and offers an explicit repair. The Host schema remains permissive, so direct Settings API writes can still store invalid numeric values. Controls show the latest accepted Host values. A refused write can be retried; an unconfirmed write disables controls until the page is reloaded to check the result. Its Settings row uses the sparkle glyph.

## Installation

Build with `pnpm install --no-frozen-lockfile --ignore-scripts` and `pnpm run build` in this package. Deploy as a profile bundle in an authorized update window; see [DEPLOY.md](DEPLOY.md).

Full Aurora glass requires DSH `0.2.2-rc.4` with the companion host’s skin markers. An unmarked rc4 host uses the native frame geometry, static Aurora colors, and existing slot and component attributes; it does not show every glass treatment.

## Ownership and unloading

The browser entry owns one `style[data-dsh-skin-style]` node, the `html[data-dsh-skin="aaron"]` marker, and two sidebar brand contributions at priority -100. The Settings navigation contribution follows the served namespace and its slot declaration. Disabling the entry removes its stylesheet and contributions, and restores the previous marker unless another owner changed it. A duplicate entry fails instead of mounting a second stylesheet.

Rules use semantic attributes rather than CSS Module hashes. On rc4 the skin replaces the host’s decorative mask and SVG with a dot inside the same footprint; reduced motion stops the pulse, and forced colors use the host glyph. Chat retains the clock, localized text, accessibility announcements and mount lifetime. Native drag regions and safe clearance stay with the host.

The legacy `conversation.chat.flow.running.icon` contribution waits for that slot to be declared. The companion rc4 host uses a marked whale tail instead and does not declare the slot, so the StateDot contribution stays inactive there.

## Window corners

The inset window rounds only its exposed edges. A hidden sidebar transfers its left corners to the center; an open right panel clips its own right corners without clipping fixed floating panes. A visible bottom-slot occupant owns the lower corners; empty outlets and occupants using `hidden` retain the column corners. Fullscreen panels keep viewport geometry. The outer canvas stays square without a window shadow; only the inset window uses circular corners. The sidebar glass and its column share the same radius so the filter cannot tint the canvas outside the curve.

The conversation header reveals the center glass instead of adding a second fill. The Plugins header uses a thin glass layer at rest and a stronger fill while scrolled. With reduced transparency, the top surfaces use the solid canvas without backdrop blur.

Run `node tests/rc4-artifact.browser.mjs` after building to verify the shipped CSS against rc4 DOM hierarchies and AppFrame styles. A preinstalled Chromium can be selected through `DSH_CHROMIUM_EXECUTABLE`. The fixture does not connect to a server or modify a profile.

## Development and hot reload

Run `pnpm run watch` after installation to rebuild the browser bundle. Replacement without refresh also requires the active Web HMR receiver and `pnpm run dev:web` running from the same companion Host checkout to rebuild client-plugin bundles. Saving source without a successful rebuild does not update the GUI. Plugin-local React state can reset. Host shell or static-package changes still require a Host build and page refresh, and sometimes a restart.

## Model Experience

No prompts, tools, events, token accounting, or model-visible data are added. Model token use and KV-cache inputs are unchanged.

## Verification

- `pnpm run typecheck`: strict production and test typing.
- The non-deployment Vitest suites exercise slot lifecycle, settings, scope, cascade, and CSS safety; `DSH_SKIN_TEST_CLIENT` selects the artifact for the settings integration test.
- `pnpm run build && pnpm run lint`: portable browser factory and publication checks.
- The built-CSS fixture checks light and dark paint, handle alignment, and marked and unmarked layouts. Neither it nor the package unit tests verifies the target profile or native chrome.

## Known Limitations and Deferred Work

Expanded tool cards, generic modals, and the rc4 running glyph require the companion markup. Native macOS and Windows titlebars, right-pane transitions, and third-party plugin combinations require deployment acceptance. The legacy workspace migration scripts do not apply to this release.
