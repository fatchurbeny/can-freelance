# Implementation Spec — Production ▸ Email Notifications

Target: `src/components/EmailNotificationView.tsx` (replaces current flat list).
Reference design: `Production Email Notifications.dc.html` in this project.

---

## 1. Goal

The current tab renders one fully-expanded card per email in a flat list. With ~57
emails this is unscannable: every card is ~400px tall, issues are always open, and
there is no way to tell which brand or which kind of email you are looking at
without reading each subject line.

The redesign makes brand and category the primary axes of navigation:

- **Brand** = Canva account (left rail + section headers)
- **Category** = what the email subject triggered (chips + subgroups)
- Individual emails collapse to a single row; issue detail is on demand.

---

## 2. Layout

Chrome is unchanged — `TopBar`, `Sidebar`, `ProductionTabNav` stay as they are.
Inside `ProductionView`, the tab panel keeps the existing page frame:

```
<main className="flex-1 p-8 bg-grid-pattern">
  <div className="w-full border border-[#f0f0f0] bg-white">   ← panel card
    [A] tab nav          ┐
    [B] toolbar row      ├ one sticky block, top-56px
    [C] category chips   ┘
    [D] brand rail (sticky) | [E] grouped list
  </div>
</main>
```

### Sticky behaviour (important)

`[A] + [B] + [C]` are wrapped in a **single** `position: sticky; top: 56px`
container. Do not give each row its own sticky offset — the toolbar wraps at
narrow widths and hardcoded offsets drift out of alignment.

The brand rail `[D]` is also sticky, but its offset must be **measured**, not
guessed:

```ts
const stickyRef = useRef<HTMLDivElement>(null);
const [railTop, setRailTop] = useState(140);

useEffect(() => {
  const el = stickyRef.current;
  if (!el) return;
  const measure = () => setRailTop(56 + el.getBoundingClientRect().height);
  measure();
  const ro = new ResizeObserver(measure);
  ro.observe(el);
  window.addEventListener('resize', measure);
  return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
}, []);
```

Apply as `style={{ top: railTop, maxHeight: `calc(100vh - ${railTop}px)` }}` with
`position: sticky; align-self: flex-start; overflow-y: auto`.

---

## 3. Components

### [B] Toolbar — single 44px row, wraps

| Cell | Notes |
|---|---|
| Search input | `flex: 1 1 240px; min-width: 220px` — must not crush |
| `ALL Canva Accounts` filter | existing account dropdown |
| `STATUS: Unresolved Issues` | existing status dropdown |
| `SYNC EMAIL` | orange `#ff5e1f`, full-height, last cell |

`SUBJECT TRIGGERS` moves out of this row — see [C].

### [C] Category chips — second row, `bg-[#fafafa]`

Label `CATEGORY`, then pill buttons. Counts respect the active brand filter.

| Chip | Subject trigger | Colour |
|---|---|---|
| All categories | — | `#111827` when active |
| PUBLISH ISSUE | "We've found some issues with your template" | `#e11d48` |
| TEMPLATE REJECTED | "Your template has not been added to Canva" | `#b91c1c` |
| LIBRARY PUBLISHED | "Your template has been added to the Canva library" | `#059669` |

Active chip = solid category colour, white text. Inactive = white bg, 1px
`#e5e7eb` border, category-coloured text. Count badge sits inside the pill.

`SUBJECT TRIGGERS` button is pushed to the right of this row (`margin-left: auto`)
and opens the existing trigger-config modal.

### [D] Brand rail — 270px, `bg-[#fafafa]`

Header: `CANVA ACCOUNTS (BRAND)` + total unresolved badge.

Rows: `ALL Brands` first, then one row per brand. Each row is
32px square avatar (brand initial, brand colour) · name · `N Total Emails` ·
unresolved count badge. Active row: white bg + 2px left border `#ff5e1f`.

Per the brief, **no category breakdown** inside rail rows — counts stay simple.

### [E] Grouped list — two levels

```
▸ Brand section header   (sticky-free, bg #f8f9fa, avatar + name + "N emails · N unresolved" + "Select all")
   ▸ Category subgroup   (chevron + coloured category badge + subject line + count) ← collapsible
        · email card
        · email card
```

**Email card** (medium density, issues collapsed):

- Checkbox (18px) — selected state: `#ff5e1f` fill, card border `#ff5e1f`
- Title (13px / 700) + status pill (`UNRESOLVED` amber, `RESOLVED` green)
- Meta line: brand · received · issue pill (`1 issue` / `2 issues`) which toggles detail
- Right: `Edit Template` button, Canva purple `#8b3dff`

**Issue detail** (only when the issue pill is toggled): rose-tinted rows,
numbered circle + issue title + message body, indented to align with the title.

### Bulk actions

When ≥1 email is selected, a dark `#111827` bar appears above the list:
`N emails selected` · `MARK FIXED / RESOLVED` (green `#10b981`) · `Clear`.
Brand section headers each have `Select all` for their own emails.

Header also carries `COLLAPSE ALL` / `EXPAND ALL` for the category subgroups.

---

## 4. State

```ts
type Category = 'publish' | 'rejected' | 'library';

const [brand, setBrand]           = useState<string>('ALL');
const [category, setCategory]     = useState<Category | 'ALL'>('ALL');
const [selected, setSelected]     = useState<Record<string, boolean>>({});
const [closedCats, setClosedCats] = useState<Record<string, boolean>>({}); // key: `${brand}|${cat}`
const [openIssues, setOpenIssues] = useState<Record<string, boolean>>({});
const [allCollapsed, setAllCollapsed] = useState(false);
```

Changing `brand` or `category` clears `selected` (avoids resolving rows the user
can no longer see).

Derivation: filter by brand + category → group by brand (rail order) → group by
category (fixed order: publish, rejected, library) → hide empty groups.

---

## 5. Data

Category is derived from the email subject, using the existing subject-trigger
config. Map each trigger to a `Category` rather than matching strings at render
time.

Emails whose sender brand is not registered in the system group under
**Other Brands**, but each card must still show the real sender name from the
email (currently `Humpback Studio` in the mock). The section header appends
`· not registered in system`.

---

## 6. Tokens

| Use | Value |
|---|---|
| Accent / active | `#ff5e1f` |
| Panel border, dividers | `#f0f0f0` |
| Rail / chip-row bg | `#fafafa`, section header `#f8f9fa` |
| Ink | `#111827` / `#262626`, muted `#6b7280`, faint `#9ca3af` |
| Publish issue | `#e11d48` on `rgba(244,63,94,.08)` |
| Template rejected | `#b91c1c` on `rgba(185,28,28,.08)` |
| Library published | `#059669` on `rgba(16,185,129,.08)` |
| Unresolved pill | `#b45309` on `rgba(245,158,11,.12)` |
| Canva purple (Edit Template) | `#8b3dff` |
| Type | Inter — 13px/700 titles, 12px body, 11px meta, 10px/700 uppercase labels |

---

## 7. Responsive

- Toolbar row wraps; search keeps a 220px floor.
- Rail + list are `flex-wrap`; below ~900px the rail stacks above the list and
  drops its sticky positioning.
- Card meta line wraps rather than truncating the brand name.

---

## 8. Build order

1. Wrap panel in the padded `main` + bordered card, single sticky header block.
2. Category derivation from subject triggers + counts.
3. Brand rail with filter state.
4. Category chip row + `SUBJECT TRIGGERS` relocation.
5. Two-level grouping with collapsible category subgroups.
6. Collapsed email card + on-demand issue detail.
7. Multi-select, bulk resolve, per-brand select all.
8. Measured sticky offset for the rail.
