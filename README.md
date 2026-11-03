# Home Dashboard

A household dashboard that runs entirely in the browser (no build step, no server). Works on phone, tablet and computer.

**Cards:** To-Do, Shopping, Notes, Recipes, Upcoming events (with colored tags: Travel, Important Days, Friends, Family or your own), Watch list (TV shows, movies, specials; check one off to hide it, tap "Watched" to see them again), Calendar (month view with US holidays; anything in Upcoming shows on it, and tapping a day lets you add an event there), Weather, Dinner plan, Chores, Bills, Quick links.
The top row has two tappable tiles (open tasks, next event) and a Dublin, CA forecast: today plus 3 days at 8 AM, 12 PM, 4 PM and 8 PM, with °F, °C and chance of rain.

## Using it
- Tap **+** on a card (or the round **+** at the bottom right) and type. Press Enter to add several in a row.
  Shopping accepts commas: `milk, eggs, rice`.
- Tap any item's text to edit it. Deleting shows an **Undo** for a few seconds.
- Notes are saved with a timestamp. Recipes can send their ingredients to Shopping.
- **Customize** (grid icon, top right): drag a card by its title to move it, drag its bottom-right corner to resize, tap × to hide. Phone, tablet and desktop each remember their own layout.
- **Install on your phone:** open the site, then Share → Add to Home Screen (iPhone) or menu → Install app (Android).

## Pin and reorder
On every list card (To-Do, Shopping, Notes, Upcoming, Recipes, Watch list, Chores, Bills, Links): hover the left of an item to get a pin icon (on a phone the icon is always faintly visible) and tap it to pin the item to the top. To reorder, press and hold an item for 1 second until the hand appears, then drag it. Pins and order are saved with your data and sync with it.

## Recipes from the Google Sheet
The Recipes card lists every recipe from the Recipes / Ingredients / Steps tabs of the Google Sheet, with search (title, category, tags, ingredients), category chips, a detail view with Prep and Cooking instructions, scaling (1/2, x1 to x4) and "Add to Shopping". Recipes you add with + stay on this dashboard under "My recipes".
- `recipes.json` is a snapshot of the Sheet, used by default. Regenerate it from the Sheet when recipes change.
- If the Sheet is shared as "anyone with the link can view", the dashboard reads it live on every open and keeps the snapshot as a fallback. Edit recipes in the Sheet (the detail view has an "Open in Google Sheets" button).
- Note: this repo is public, so the snapshot is publicly readable.

## Where the data lives
Each device keeps its data in that browser's local storage. To share it across devices, open **Settings → Sync across devices** and paste a GitHub token (classic token with only the `gist` permission). The dashboard then keeps a private Gist in sync. The latest change wins if two devices edit at the same time.
Settings also has on/off switches for every card (hidden cards keep their data), and a backup download / restore.

## Files
`index.html`, `styles.css`, `app.js` (all the logic), `recipes.json` (recipe snapshot), `sw.js` + `manifest.webmanifest` (offline / installable), `icons/`.
