## 2024-05-18 - [Fix XSS in Chat Admin Dashboard]
**Vulnerability:** XSS vulnerability in `apps/web/src/app/admin/private-chats/page.tsx` via use of `dangerouslySetInnerHTML`. A malicious user could send a payload in their chat messages, and if an admin searched for it, it would be injected into the DOM as part of text highlighting.
**Learning:** Avoid using string replacement paired with `dangerouslySetInnerHTML` for search highlighting. React will interpret tags rather than escaping them, leading to XSS vulnerabilities where user input is involved.
**Prevention:** Always parse text dynamically and render it safely using React Elements (e.g. `<mark>`) instead of manipulating raw HTML strings.
