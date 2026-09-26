# My Budget

A private, responsive budget tracker in plain HTML, CSS, and JavaScript. The interface uses an Apple-inspired dark appearance with blue accents and two bottom tabs: Dashboard and History. Use the sun/moon button in the header to switch to light mode. Your choice is remembered in this browser.

Preview Tool: https://naresh26gear.github.io/MyBudget/

## Run it

1. Extract the whole ZIP into a folder.
2. Open `index.html` in a current browser to try it immediately. Keep the other files beside it.
3. For consistent long-term storage, use a stable website address or a local server. In VS Code, open the folder and choose **Open with Live Server** on `index.html`. Alternatively, run `python3 -m http.server 8080` from the folder, then open `http://localhost:8080`.

There is no npm install, build step, account, API key, database server, or external font/CDN dependency. You can host this directory on any static web host.

An optional Vite development server is included for developers: with Node.js 22.12+ installed, run `npm ci`, then `npm run dev`. This is entirely optional; the plain website works without it. Keep the same local port between sessions to preserve the storage origin.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Accessible page structure, dashboard, history, and modal forms |
| `styles.css` | Responsive layout, system typography, transitions, and reduced-motion support |
| `app.js` | Budget and expense logic, localStorage, analytics, filters, backup/restore |
| `theme.js` | Dark/light appearance and saved theme preference, applied before page rendering |
| `pdf.js` | Offline, direct-download PDF export without third-party libraries |
| `favicon.svg` | Local application icon |
| `README.md` | Setup, usage, and storage notes |
| `package.json`, `package-lock.json`, `vite.config.mjs` | Optional local development server; not required for the website |

## Use the tool

- First, select **Set your budget** and enter a name and amount. No fake expenses are added.
- Use **Add expense** for the amount, description, category, date, and optional note.
- The Dashboard shows spent versus total, remaining funds, and a bar chart. Choose 7 days, 30 days, or all time. Hover, tap, or keyboard-focus chart bars for amounts. Longer ranges are grouped into at most seven periods.
- The History tab contains search and date filters. Select the three dots on an expense to edit or delete it. Deletion requires confirmation.
- **Export** in the History header opens PDF settings: date range and included sections. The PDF downloads directly; no print dialog is required. A custom range filters the history/category sections. The summary labels whole-budget totals separately from the selected period.
- PDF reports stay white for clean printing. They show compact totals and a transaction table with **at most 20 entries per page**. Long descriptions wrap fully and may reduce the number that fits. Notes stay in the app and are omitted from the report. Category breakdown is optional and off by default; repeated branding, generation timestamps, and decorative charts are removed.
- Click the budget name or edit button to change its amount/name, switch budgets, or create another. Budgets keep separate histories.
- Open **Backup & restore** in the budget dialog to download a JSON copy of all budgets. Restore replaces the current records after confirmation. This backup is readable, so keep it somewhere private.

## Browser storage

Data is saved under `my-budget.data.v1` in localStorage after every successful change. Amounts are integer paise to keep calculations exact. All processing, analytics, and PDF generation run in the browser. The application sends no financial data to a server and contains no analytics or tracking scripts.

The appearance preference is stored separately under `my-budget.theme.v1`. Existing budget records and backups remain compatible with this update. Replace the website files at the same address to keep using your saved records; back up before moving to a different address. Backups contain budget data, not your theme choice.

LocalStorage has no application expiry, but it is **not a permanent backup**. Records are tied to the browser profile and website origin (protocol, hostname, and port). Clearing site data, private browsing, browser removal, storage pressure, or changing address can make them unavailable. Opening a file directly with `file://` works for trying the tool, but storage behaviour varies between browsers and file locations. Use one stable address and periodically save a backup. The tool cannot silently migrate data between different origins; use backup/restore.

This is local privacy, not encryption or a password lock. Anyone with access to the same browser profile can access the records. Storage errors are shown instead of silently pretending a change was saved. Invalid saved data is not automatically overwritten. Another open tab can update the interface; stale forms must be reopened before saving.

## PDF implementation

`pdf.js` creates multi-page A4 PDF files locally, including Unicode text and the rupee symbol using system fonts. Pages are rendered at 2.4× resolution and embedded as high-quality images. This makes the PDF portable and independent of fonts/CDNs, but the report text is not selectable/searchable and screen readers cannot read the PDF's text. The website itself uses semantic HTML, labels, focus states, and keyboard controls. Very large reports are best exported using a shorter date range.

## Browser compatibility and interaction

Designed for current Chrome, Edge, Firefox, and Safari with native `<dialog>`, Canvas, localStorage, and Blob download support. On iPhone/iPad, the browser may open the PDF in its viewer; use the share control to save it to Files. Desktop dialogs become bottom sheets on mobile. Motion respects the system's **Reduce motion** preference. No internet connection is needed once the files have loaded; the project is not an installable PWA and does not include a service worker.

## Data limits

- Currency: INR, two decimal places.
- Up to 100 budgets and 20,000 expenses per budget, subject to browser storage quota.
- Individual amount: ₹0.01 to ₹99,99,99,999.
- New expenses must be dated today or earlier.
- Overspending is allowed and shown clearly as a negative balance.

## Customization

Change design tokens at the beginning of `styles.css` to adjust colors, spacing, or corners. The font stack uses the device's native system fonts. Change categories in both `app.js` and the category select in `index.html` together. No paid fonts or proprietary Apple assets are included.
