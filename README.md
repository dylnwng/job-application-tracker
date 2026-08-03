# Job Application Tracker

This workspace contains a lightweight Chrome extension and local dashboard for tracking job applications.

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
