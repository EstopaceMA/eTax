# eTax Design System

## Design Direction

eTax should use the Minimals visual system as its foundation: clean Material UI structure, restrained surfaces, soft depth, strong readability, and dashboard-first interaction patterns.

The product should feel like a calm compliance workspace rather than a marketing site. Users are often uncertain about tax obligations, so the interface must make progress, next steps, missing items, and filing status obvious without making the experience feel legalistic or intimidating.

Primary design reference: Minimals UI Kit at https://minimals.cc/ and Minimal UI documentation at https://docs.minimals.cc/.

## Product Personality

- Clear, quiet, and trustworthy.
- Helpful without sounding advisory.
- Organized around actions, not tax jargon.
- Modern and polished, but never decorative at the expense of comprehension.

## Design Principles

- Guidance first: every screen should answer what applies, what is missing, and what to do next.
- Trustworthy but approachable: use compliance cues through structure, labels, and status states rather than heavy seals or bureaucratic visuals.
- Dashboard density: prioritize scan-friendly cards, tables, checklists, and timelines over oversized landing-page sections.
- One primary action per view: each screen should make the next user action visually dominant.
- Visible state: registration, documents, readiness, filing, and payment should always show clear progress.
- Minimals discipline: use soft surfaces, precise spacing, moderate radius, light shadows, and strong typography hierarchy.

## Foundation

Minimals is built on Material UI and organized around reusable atomic design components. eTax should follow that model:

- Foundation: color, typography, spacing, shadows, radius, icons.
- Components: buttons, inputs, cards, alerts, labels, lists, tables, tabs, dialogs.
- Patterns: onboarding flows, task checklists, readiness checks, status dashboards, and quarterly filing trackers.
- Pages: dashboard, tax profile, document checklist, deadline calendar, and filing tracker.

## Color System

Use the Minimals palette as the base. Prefer semantic color usage over decorative color.

### Brand Palette

| Token | Hex | Usage |
| --- | --- | --- |
| `primary.lighter` | `#C8FAD6` | Soft selected backgrounds, success-adjacent panels. |
| `primary.light` | `#5BE49B` | Hover accents, lightweight illustrations. |
| `primary.main` | `#00A76F` | Primary buttons, active navigation, progress completion. |
| `primary.dark` | `#007867` | Button hover, focused active states. |
| `primary.darker` | `#004B50` | High-emphasis text on pale primary surfaces. |

### Secondary Palette

| Token | Hex | Usage |
| --- | --- | --- |
| `secondary.lighter` | `#EFD6FF` | Optional highlight surfaces. |
| `secondary.light` | `#C684FF` | Rare accents. |
| `secondary.main` | `#8E33FF` | Secondary feature accents only. |
| `secondary.dark` | `#5119B7` | Secondary active states. |
| `secondary.darker` | `#27097A` | High-contrast secondary text. |

Use secondary sparingly. eTax should not become a purple dashboard.

### Semantic Palette

| Token | Hex | Usage |
| --- | --- | --- |
| `info.main` | `#00B8D9` | Informational guidance and filing tracker context. |
| `success.main` | `#22C55E` | Completed tasks, filed, paid, ready. |
| `warning.main` | `#FFAB00` | Upcoming deadlines, incomplete readiness. |
| `error.main` | `#FF5630` | Overdue, blocked, missing required information. |

Always pair semantic colors with text labels or icons. Do not rely on color alone.

### Neutral Palette

| Token | Hex | Usage |
| --- | --- | --- |
| `grey.50` | `#FCFDFD` | App background in light mode. |
| `grey.100` | `#F9FAFB` | Subtle section background. |
| `grey.200` | `#F4F6F8` | Page background, inactive controls. |
| `grey.300` | `#DFE3E8` | Borders and dividers. |
| `grey.400` | `#C4CDD5` | Disabled icon strokes. |
| `grey.500` | `#919EAB` | Helper text, placeholders. |
| `grey.600` | `#637381` | Secondary body text. |
| `grey.700` | `#454F5B` | Supporting headings. |
| `grey.800` | `#1C252E` | Primary text in light mode. |
| `grey.900` | `#141A21` | Dark surfaces and high-emphasis text. |

## Typography

Use Minimals typography defaults:

- Primary font: `Public Sans`.
- Display/accent font: `Barlow`.
- Fallback: `Helvetica, Arial, sans-serif`.

### Type Roles

| Role | Font | Weight | Usage |
| --- | --- | --- | --- |
| Page title | Public Sans | 700-800 | Dashboard and major page headings. |
| Section heading | Public Sans | 700 | Cards, panels, grouped content. |
| Body | Public Sans | 400-500 | Instructions, descriptions, table text. |
| Label | Public Sans | 600 | Form labels, status labels, chips. |
| Metric display | Barlow | 900 | Large progress numbers or key deadline counts only. |

### Copy Rules

- Use sentence case for headings, buttons, labels, and menu items.
- Prefer direct action labels: `Start registration checklist`, `Review missing items`, `Update filing status`.
- Avoid tax jargon unless paired with a plain-language explanation.
- Use short helper text that explains what the user can decide or do.
- Avoid phrases that imply certified tax advice.

## Spacing

Use an 8px spacing grid.

| Token | Value | Usage |
| --- | --- | --- |
| `space.0` | `0` | Flush layouts. |
| `space.1` | `4px` | Tight icon/text gaps. |
| `space.2` | `8px` | Compact component padding. |
| `space.3` | `12px` | Chip and input internal gaps. |
| `space.4` | `16px` | Card padding on mobile. |
| `space.5` | `20px` | Form groups. |
| `space.6` | `24px` | Card padding on desktop. |
| `space.8` | `32px` | Section gaps. |
| `space.10` | `40px` | Major page spacing. |

## Radius

Minimals uses rounded, modern UI shapes. Keep the system soft but disciplined.

| Token | Value | Usage |
| --- | --- | --- |
| `radius.xs` | `4px` | Inputs inside dense tables. |
| `radius.sm` | `8px` | Buttons, chips, small controls. |
| `radius.md` | `12px` | Cards, alerts, list panels. |
| `radius.lg` | `16px` | Dialogs, large summary panels. |
| `radius.pill` | `999px` | Badges, status chips, segmented controls. |

Do not nest cards inside cards. If content needs hierarchy inside a card, use dividers, rows, or subtle tinted areas.

## Shadows and Borders

Use shadows sparingly. Most separation should come from background contrast, spacing, and `1px` borders.

- Default border: `1px solid rgba(145, 158, 171, 0.16)`.
- Strong border: `1px solid rgba(145, 158, 171, 0.24)`.
- Hover border: `1px solid rgba(0, 167, 111, 0.48)`.
- Card shadow: soft, low-opacity elevation only for floating panels or dialogs.
- Avoid heavy drop shadows on dashboard cards.

## Layout

Use Minimals dashboard conventions.

### Shell

- Mobile header height: `64px`.
- Desktop header height: `80px`.
- Desktop vertical nav width: `280px`.
- Mini nav width: `88px`.
- Page max width: `1200px` for content-heavy pages.
- Use a persistent left navigation on desktop and bottom or drawer navigation on mobile.

### Page Structure

Each main app page should follow this rhythm:

1. Page title and short contextual subtitle.
2. Primary status or next action.
3. Main work area.
4. Supporting details, history, or guidance.

### Dashboard Layout

```text
+------------------------------------------------------+
| Header: search, reminders, account                   |
+------------+-----------------------------------------+
| Nav        | Page title + next action                 |
|            |                                         |
|            | Status summary cards                     |
|            |                                         |
|            | Checklist / deadlines / profile filing   |
|            |                                         |
|            | Handoff and recent activity              |
+------------+-----------------------------------------+
```

## Components

### Buttons

- Primary button: filled `primary.main`, white text.
- Secondary button: soft primary background or outlined neutral.
- Destructive button: use `error.main` only for real destructive actions.
- Buttons should include icons when the action is directional, external, status-changing, or tool-like.
- Button text should describe the result: `Save profile`, `Update filing status`, `Mark as paid`.

### Cards

Use cards for discrete objects:

- Document requirement.
- Deadline.
- Filing obligation.

Cards should include a clear title, status, relevant metadata, and one obvious action when needed.

### Status Chips

Use pill chips with both color and text:

- `Draft`: grey.
- `Missing items`: warning.
- `Ready`: info or primary.
- `Filed`: success.
- `Paid`: success.
- `Overdue`: error.

### Alerts

Use alerts for actionable system guidance:

- Info: explain a filing status or readiness step.
- Warning: show upcoming deadline or incomplete readiness.
- Error: explain missing required details.
- Success: confirm saved, filed, paid, or completed status.

Alerts should say what happened and what the user can do next.

### Forms

- Use single-column forms on mobile and constrained forms on desktop.
- Group tax profile questions by user-understandable topics: work, income, registration, filing status.
- Avoid long legal labels. Use helper text below fields for examples.
- Validation should appear inline and use specific language.

### Tables and Lists

Use tables for recurring obligations and lists for checklist-style tasks.

Tables should support:

- Status chip.
- Due date.
- Filing period.
- Channel.
- Last updated.
- Row action.

Lists should support:

- Checkbox or completion state.
- Required/optional label.
- Short explanation.
- Related form, checklist, or filing step.

### Navigation

Recommended primary navigation:

- Dashboard.
- Tax profile.
- Documents.
- Deadlines.
- Filing tracker.

Use active navigation with `primary.main` and soft primary background.

## eTax Signature Pattern

Use a `Filing Readiness Panel` as the product's signature interface element.

It should be a compact dashboard panel that shows:

- Required profile details.
- Missing documents.
- Next deadline.
- Current filing status.
- Payment status.

Each row should show status, missing items, and the next useful action. This gives eTax a recognizable interaction pattern while staying inside the Minimals design language.

## Dark Mode

Support dark mode using the Minimals approach.

- Background: `grey.900`.
- Surface: `grey.800`.
- Primary text: `#FFFFFF`.
- Secondary text: `grey.400`.
- Borders: `rgba(145, 158, 171, 0.24)`.
- Primary actions remain `primary.main`.

Never invert semantic meaning in dark mode. Warning, error, success, and info states should keep the same roles.

## Accessibility

- Maintain WCAG AA contrast for text and controls.
- Provide visible keyboard focus states.
- Do not rely on color alone for readiness, payment, filing, or overdue states.
- Make touch targets at least `44px` high.
- Keep forms navigable by keyboard.
- Respect reduced motion settings.

## Motion

Use motion only to support understanding:

- Checklist completion: quick check transition.
- Filing status updates: short confirmation state before status changes.
- Loading states: skeletons instead of spinners for dashboard content.

Avoid decorative animation in tax workflows.

## Implementation Notes

- Prefer Material UI components and theme overrides.
- Keep tokens centralized in a theme file.
- Use CSS variables for palette values if the stack supports theme switching.
- Use `Public Sans` for the app shell and content.
- Use `Barlow` only for high-emphasis metric displays.
- Keep page sections unframed; use cards only for repeated objects or modals.
- Use filing tracker actions as in-product steps with clear status outcomes.

## Sources

- Minimals landing page: https://minimals.cc/
- Minimal UI documentation introduction: https://docs.minimals.cc/
- Minimal UI colors documentation: https://docs.minimals.cc/v5/colors/
- Minimal UI typography documentation: https://docs.minimals.cc/v5/typography/
- Minimal UI layout documentation: https://docs.minimals.cc/v5/layout/
