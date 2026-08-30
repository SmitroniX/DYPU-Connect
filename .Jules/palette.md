## 2026-08-30 - Added aria-labels to icon-only buttons
**Learning:** Found several icon-only buttons (`<X />`) used across different UI elements (chat drawers, banners, mobile sidebars) that lacked `aria-label` attributes. This is a common pattern for "close" or "dismiss" actions.
**Action:** Always check for `aria-label` on buttons that only contain an icon, especially those performing standard actions like closing modals, dismissing alerts, or toggling menus.
