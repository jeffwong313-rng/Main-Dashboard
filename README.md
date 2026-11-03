# Home Dashboard

A household dashboard that runs entirely in the browser (no build step, no server). Works on phone, tablet and computer.

**Cards:** To-Do, Shopping, Notes, Recipes, Upcoming events, Weather, Dinner plan, Chores, Bills, Quick links.
The summary tiles at the top (open tasks, items to buy, bills left, next event) are tappable and jump to their card.

## Using it
- Tap **+** on a card (or the round **+** at the bottom right) and type. Press Enter to add several in a row.
  Shopping accepts commas: `milk, eggs, rice`.
- Tap any item's text to edit it. Deleting shows an **Undo** for a few seconds.
- Notes are saved with a timestamp. Recipes can send their ingredients to Shopping.
- **Customize** (grid icon, top right): drag a card by its title to move it, drag its bottom-right corner to resize, tap × to hide. Phone, tablet and desktop each remember their own layout.
- **Install on your phone:** open the site, then Share → Add to Home Screen (iPhone) or menu → Install app (Android).

## Where the data lives
Each device keeps its data in that browser's local storage. To share it across devices, open **Settings → Sync across devices** and paste a GitHub token (classic token with only the `gist` permission). The dashboard then keeps a private Gist in sync. The latest change wins if two devices edit at the same time.
Settings also has a backup download / restore.

## Files
`index.html`, `styles.css`, `app.js` (all the logic), `sw.js` + `manifest.webmanifest` (offline / installable), `icons/`.
