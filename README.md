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

## News widget

A GitHub Action (`.github/workflows/news.yml`, script `scripts/fetch_news.py`) reads RSS feeds (BBC, NPR, CBS, Guardian, CNBC, KQED, Mercury News, ESPN, Ars Technica and more) at **6 AM, 12 PM and 6 PM Pacific**, groups the same story across outlets, scores importance (outlet agreement, feed position, recency, plus a bonus for stories already in the previous top 5 so big news stays), and commits `news.json`. The News card shows the top 5, each tagged by topic. Open a topic chip and tap **Favorite** to guarantee at least one headline from it in the Top 5. Run it any time from the repo's Actions tab ("Update news" → Run workflow). Edit the `FEEDS` list in the script to change sources.

## Default layout for everyone

Settings → **Layout for everyone** → *Copy layout code*. Send that code to Claude, who saves it as `layout.default.json`. Devices that have not customized their layout (and new installs) start from it; *Use the shared layout here* resets a device to it.

## Fluid layout

The grid follows the real window width: the column count steps with the width (2/4 on phones, 6/8 on tablets, 12 on desktop) and every card keeps its share of the row, so cards wrap to the next row as the window narrows. There is no desktop/mobile toggle.

## Tags

Every list card (To-Do, Shopping, Notes, Upcoming, Watch list, Chores, Bills, Quick links) has an optional **Tag** box in its add row (pick an existing tag or type a new one) and a small tag chip on each item that you can tap to change. The **Tags** bar under the forecast lists every tag in use (plus any news topic you favorited); tap one to see all matching items across the dashboard and matching news headlines.

## Free placement

Cards sit on a real grid. In Customize layout, drag a card by its header to any open spot and it stays there (no automatic bumping or compacting); drop is ignored where it would overlap another card. Resizing is also blocked from overlapping. Hiding a card leaves its space open.

## Dynamic colors

Card colors come from an 11-color palette and are recomputed whenever cards move, resize, hide or show: each card keeps its own color unless a touching neighbor already has it, in which case it switches to a free color. Two touching cards never share a color; cards with a gap between them can.

## Date ranges in Upcoming

Events have an optional **To** date (for trips and other multi-day plans). A range shows as "Nov 10 to Nov 16 · 7 days", stays in Upcoming and Next up until it ends, and appears on every day it covers in the Calendar. Tap the date text on an event to set, change or clear its end date.

## Full-screen calendar

Tap the Calendar card's title (or its expand icon) to open a full-screen, Outlook-style month: multi-day events are drawn as bars across the days they cover, colored by tag, with a legend (Travel, Important Days, Friends, Family, any tags you add, Other, Holidays). Tap a legend item to hide or show that group, tap a day to see and add events for it.
