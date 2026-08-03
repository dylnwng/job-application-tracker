# Job Application Tracker

This workspace contains a lightweight Chrome extension and local dashboard for tracking job applications.

## Why I built this

Most job tracking tools I looked at gate the useful features behind a paywall, and even the free ones still leave you copy-pasting company, title, and link into a spreadsheet by hand for every single application — friction that adds up fast during an active job search. I wanted two things instead: the tracker to live inside the browser tab I'm already on, and the data entry to be automatic rather than something I do myself after the fact.

That shaped the core decisions:
- **A content script that scrapes the page**, not a form I fill out — capture should be near-zero-effort at the moment I'm already looking at a job posting.
- **A confirmation popup before saving**, not a silent auto-save — scraping is never perfect, so there's one quick check rather than a dashboard full of bad data later.
- **Local IndexedDB storage, no account or backend** — this is what keeps it free and paywall-free by construction, not just as a pricing choice.
- **A staleness flag (14 days, no edits, still "Applied")** — the actual failure mode I kept hitting wasn't losing track of applications, it was forgetting to follow up on the ones sitting silently in a "waiting to hear back" state.

## Files
- manifest.json: Extension manifest for a Manifest V3 Chrome extension
- content.js: Scrapes the active tab for company, title, location, description, and URL
- popup.html and popup.js: Confirmation modal for reviewing and saving captured data
- db.js: IndexedDB storage layer for local persistence
- dashboard.html and dashboard.js: Kanban-style dashboard for editing and reviewing applications
- styles.css: Shared styling for the popup and dashboard

## How to use it
1. Open Chrome and go to chrome://extensions.
2. Enable Developer mode.
3. Click Load unpacked and select this workspace folder.
4. Open the extension popup from the toolbar and capture a job page.
5. Review the saved information, then open the dashboard to edit statuses, notes, and salary details.

## Notes
- Data is stored locally in IndexedDB in the browser.
- Applications with the status Applied that have not been edited for more than 14 days are flagged as stale.
