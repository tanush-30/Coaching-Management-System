# Landing Page Dynamic Transitions & Visual Polish — Implementation Plan v2

Enhance the ApexERP landing page with smooth, hardware-accelerated CSS transitions, interactive tab/state animations, and ambient micro-interactions — delivered in safe, verifiable phases rather than one large sweeping change.

## Why v2

The original plan was a solid inventory of *what* to animate, but it lists every section as one flat batch with no sequencing, no shared animation contract, no accessibility/performance guardrails, and no per-component acceptance criteria. This version keeps the original scope but adds:
- A shared design-token layer so every component pulls from the same durations/easings (avoids "shimmer here is 2s, shimmer there is 1.4s" drift).
- A phased rollout so `tsc`/`build` and visual QA happen after each slice, not once at the very end.
- Explicit performance and accessibility constraints, since animation-heavy landing pages are the most common source of janky mobile scroll and motion-sickness complaints.
- Concrete acceptance criteria per component instead of "verify smooth."

---

## Guardrails (apply to every change below)

1. **Animate only `transform`, `opacity`, and `filter`.** No animating `width`, `height`, `top/left`, or `box-shadow` directly (use `grid-template-rows` trick for height, and a pseudo-element or `filter: drop-shadow` for glow).
2. **Respect `prefers-reduced-motion: reduce`.** Every keyframe animation gets a media-query override that disables or drastically shortens it — not just a blanket `animation: none`, but keep opacity/visibility changes so content isn't stuck hidden.
3. **One duration/easing scale, defined once.** Add these as CSS custom properties in `globals.css` and reference them everywhere instead of hardcoding values per component:
   - `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`
   - `--ease-out-smooth: cubic-bezier(0.16, 1, 0.3, 1)`
   - `--dur-fast: 150ms`, `--dur-base: 300ms`, `--dur-slow: 500ms`, `--dur-ambient: 3000ms`+
4. **No layout shift (CLS).** Floating/ambient animations must be applied to absolutely-positioned or `transform`-only elements so they never push surrounding content.
5. **Mobile perf budget.** Ambient/looping animations (float, pulse, shimmer) must be capped to a reasonable count per viewport (e.g., no more than ~4-6 concurrently animating elements above the fold) and paused via `IntersectionObserver` or CSS `content-visibility`/`animation-play-state` when off-screen, since infinite keyframes on hidden sections still burn CPU/battery on mobile Safari.
6. **SSR/hydration safety.** Any animation driven by client state (active tab, modal open) must default to its "settled" visual state on first paint to avoid a flash of the pre-animation state before hydration.

---

## Phase 1 — Foundation (must land first, nothing else depends-safe without it)

### [MODIFY] `globals.css`
- Add CSS custom properties for duration/easing (see Guardrails §3).
- Add keyframes, each with a `@media (prefers-reduced-motion: reduce)` override:
  - `floatSlow` / `floatReverse` — vertical oscillation, ~6-8s loop, small amplitude (6-10px) so it reads as "ambient" not distracting.
  - `pulseGlow` — opacity/filter-based breathing glow for radial backgrounds and live-status dots.
  - `shimmer` — background-position sweep for CTA buttons/badge borders; implemented via `background: linear-gradient(...)` + `background-size` + `animation`, not a moving DOM element.
  - `fadeInUp` / `scaleIn` — entrance transitions using `--ease-spring`.
  - `slideInRight` / `slideInLeft` — directional tab-switch transitions.
  - `popIn` — bounce entrance for chat/notification bubbles.
- Add the accordion smooth-height utility: `grid-template-rows: 0fr` → `1fr` transition pattern (requires the row to wrap content in a `min-h-0 overflow-hidden` child — note this explicitly since it's the most common bug with this technique).
- **Acceptance criteria:** all keyframes defined once, referenced by class name only (no component redefines a keyframe); `prefers-reduced-motion` verified in DevTools by toggling the OS setting.

---

## Phase 2 — High-traffic interactive components

### [MODIFY] `HeroSection.tsx`
- Tab transitions between Dashboard / WhatsApp / Fees / Grades preview panes using `slideInRight`/`slideInLeft` (direction based on tab index delta, not always the same direction).
- Floating ambient badges via `animate-float-slow` / `animate-float-reverse` — cap to 2-3 elements, absolutely positioned.
- "Simulate Live Alert" WhatsApp interaction: bubble `popIn` + checkmark state transition (single → double tick), debounced so rapid re-clicks don't stack animations.
- CTA button hover: glow (`filter: drop-shadow`) + arrow `translateX` on hover/focus (include `:focus-visible`, not just `:hover`, for keyboard users).
- **Acceptance criteria:** switching tabs never shows two panes fully overlapping mid-transition (use `grid-area` stacking or `position: absolute` during transition); no CLS when the alert simulator fires.

### [MODIFY] `RolePortalsShowcase.tsx`
- Animated pill indicator that slides/resizes to the active tab (Admin/Faculty/Parent/Student) using `transform: translateX` + `width` transition on the pill only (acceptable since it's a small decorative element, not content).
- Slide-in/fade-in on preview change, hover lift + border glow on selector cards.
- **Acceptance criteria:** pill position is computed from actual tab DOM width (via `ref` + `getBoundingClientRect`) so it stays aligned if copy length changes, not hardcoded percentages.

### [MODIFY] `WhatsAppFeatureSection.tsx`
- Animated bubble entrances per template (Attendance/Fees/Scorecard/Broadcast) using `popIn`, staggered ~80-120ms per bubble if multiple appear at once.
- Delivery status animates single tick → double tick with a short delay to feel authentic (~600-900ms), not instant.
- **Acceptance criteria:** switching templates rapidly cancels in-flight timers so ticks/bubbles from the previous template don't finish animating over the new one.

---

## Phase 3 — Supporting sections

### [MODIFY] `FeaturesGrid.tsx`
- Category filter tab transition (reuse Phase 1 slide/fade primitives — do not invent new ones).
- Card hover: subtle elevation (`transform: translateY(-4px) scale(1.01)`) + border-gradient shine; keep 3D tilt effect minimal or omit if it risks feeling gimmicky on a B2B SaaS landing page — flag for design review rather than assuming yes.
- Smooth transition between active feature preview widgets.
- **Acceptance criteria:** hover effects don't trigger reflow of sibling cards (use `transform`, never `margin`/size changes).

### [MODIFY] `RoiCalculator.tsx`
- Slider track fill animates smoothly with drag (CSS `transition` on the filled-track width or a `transform: scaleX` track for better perf).
- Pulse highlight on the revenue-recovery and time-saved numbers when they change, but throttled so continuous dragging doesn't retrigger a full pulse every pixel — trigger on drag-end or on value-change with a short debounce.
- **Acceptance criteria:** dragging the slider stays at 60fps on a mid-tier mobile device (test via Chrome DevTools CPU throttling 4x).

### [MODIFY] `FaqSection.tsx`
- Replace show/hide with the `grid-template-rows` `0fr → 1fr` pattern from Phase 1 (`transition-[grid-template-rows] duration-300 ease-out`).
- 180° icon rotation synced to the same duration.
- **Acceptance criteria:** expanding one item while another is open doesn't cause the whole list to jump (each item's transition is independent, not layout-affecting outside its own row).

### [MODIFY] `QuickLoginModal.tsx`
- Backdrop fade (`transition-opacity duration-300`), modal scale-up entrance (`scale-95 opacity-0` → `scale-100 opacity-100`), smooth tab switch between role credentials.
- **Acceptance criteria:** focus trap and `Escape`-to-close still work during/after the animation; animation doesn't delay interactivity (modal is interactive as soon as it starts appearing, not only after the transition ends).

### [MODIFY] `CtaSection.tsx` & `StatsBanner.tsx`
- Continuous subtle shimmer on the primary CTA banner (background-position sweep, not a moving overlay div).
- Hover scale-lift + glass glow on stat badges.
- **Acceptance criteria:** shimmer loop has no visible seam/jump at the animation loop point.

---

## Sequencing & Dependencies

```
Phase 1 (globals.css tokens + keyframes)
        │
        ▼
Phase 2 (Hero, RolePortals, WhatsAppFeature)  ── ship & verify ──▶
        │
        ▼
Phase 3 (FeaturesGrid, RoiCalculator, Faq, QuickLoginModal, Cta/Stats)
```
Phase 2 and 3 components must not define their own keyframes/durations — if a component needs something Phase 1 doesn't provide, add it to `globals.css` first, then consume it, to avoid drift.

---

## Verification Plan

### Automated (run after Phase 1, and again after each of Phase 2/3)
- `npx tsc --noEmit` — type safety across all modified files.
- `npm run build` — zero build errors or CSS syntax issues.
- Lighthouse (mobile, throttled) on the landing page — flag if animations drop the Performance score below the pre-change baseline.

### Manual / Visual Verification
1. **Hero Preview Tabs** — click Admin Overview / WhatsApp OS / Fee Collection / Marks & Reports; confirm directional slide (not just crossfade) and no double-render flash.
2. **WhatsApp Simulator** — click each template pill rapidly in succession; confirm no stacked/overlapping bubble animations.
3. **Role Portals Showcase** — switch Admin/Faculty/Parent/Student; confirm the indicator pill tracks the correct tab width, including on a resized/narrow viewport.
4. **ROI Sliders** — drag both sliders quickly and slowly; confirm 60fps feel and that the pulse highlight doesn't spam-trigger.
5. **FAQ Accordion** — open multiple items in sequence; confirm independent smooth height expansion with no jump.
6. **Quick Login Modal** — open/close repeatedly, tab through role credentials, confirm focus trap and Escape still work.
7. **Reduced Motion Pass** — enable OS-level "reduce motion" and re-check all six items above; confirm animations are disabled/shortened but content is still fully visible and usable.
8. **Low-end Mobile Pass** — test on a throttled/mid-tier device profile for scroll jank from ambient floating/shimmer effects above the fold.

---

## Open Questions for Review

- Should the 3D tilt effect on `FeaturesGrid` cards be included, or is a simpler elevation-only hover preferred for a B2B product? (flagged in Phase 3)
- Is there an existing design-token file (Tailwind config) these new CSS variables should live in instead of `globals.css`, to keep a single source of truth?
- Any target device/browser matrix (e.g., minimum supported mobile Safari version) that should set the performance bar for the guardrails above?
