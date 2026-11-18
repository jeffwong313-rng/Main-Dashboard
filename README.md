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
Each device keeps its data in that browser's local storage. To share it across devices, open **Settings → Sync across devices** and paste a GitHub token (classic token with only the `gist` permission). The dashboard then keeps a private Gist in sync. Changes are merged item by item: if two people edit at the same time, both keep their changes (two new shopping items both stay, one person checks off Milk while the other renames Eggs, and so on). A delete stays deleted unless someone edited that item on another device in the meantime, and if both people change the same field of the same item, the device that syncs second keeps its version. Every device needs this update for merging to work; a device still on the old version just overwrites the cloud copy.
Settings also has on/off switches for every card (hidden cards keep their data), and a backup download / restore.

## Files
`index.html`, `styles.css`, `recipes.json` (recipe snapshot), `sw.js` + `manifest.webmanifest` (offline / installable), `icons/`.

The logic lives in `js/`. These are plain scripts with no build step, loaded in the order listed in `index.html` and sharing one scope, so a later file can use anything an earlier file defines:

| File | What it does |
|---|---|
| `util.js` | small helpers, icons |
| `store.js` | the saved data, `save()` |
| `layout.js` | grid layout per screen size |
| `ui.js` | toasts and Undo, sheets, inline editing |
| `widgets/lists.js` | To-Do, Shopping, Watch list, Notes |
| `widgets/recipes.js`, `recipe-viewer.js` | recipe feed from the Sheet, detail view and editor |
| `widgets/planner.js` | Upcoming, Calendar, Dinner plan, Chores, Bills, Quick links |
| `widgets/weather.js`, `widgets/news.js` | Weather and News cards |
| `top.js`, `tagbar.js` | summary tiles, Dublin forecast, tag bar |
| `calendar-full.js` | full-screen calendar |
| `grid.js` | building cards, pin and reorder, customize mode |
| `quickadd.js`, `voice.js` | the round + button and voice add |
| `device.js` | phone or big-screen view, touch or mouse, text size, swipes |
| `wall.js` | wall display mode, screensaver, night mode |
| `theme.js`, `merge.js`, `sync.js`, `settings.js` | theme, sync merge, Gist sync, Settings |
| `pair.js`, `vendor/qrcode.js` | Add a device (QR code / link) and Sign out this device; QR library by Kazuhiko Arase, MIT |
| `boot.js` | password gate and start-up |

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

News rotation (off by default; the footer link turns it on): the News card steps through Top 5 and then each topic every 10 seconds (favorites first). Tapping a topic pauses it for 45 seconds; hovering, opening a sheet or editing layout also pauses it, and the footer button turns rotation off or on.

The news workflow checks every 30 minutes and fetches once per 6 AM / 12 PM / 6 PM Pacific slot (GitHub's scheduler often runs late or skips runs, so a single run per slot was unreliable).

News card: the topic chips are a swipeable single row (swipe or scroll sideways, tap one to open it); touching the row pauses the 10-second rotation. Each headline shows its topic tag and source on top with the title at full width below.

## Phone view, touch controls and wall mode

The dashboard detects each device on its own (Settings → **This device** can override it, and that choice stays on that device only):

- **Phone view** (narrow screens and landscape phones): one column of full-width cards with a tab bar at the bottom: **Today** (To-Do, Upcoming, News, summary tiles), **Lists** (Shopping, Watch list, Chores), **Plan** (Calendar, Bills), **Food** (Dinner plan, Recipes), **More** (Notes, Quick links, Weather). Red badges show what needs you. Tap the active tab again to jump to the top. The **+** button picks a sensible type for the tab you are on. The grid button opens **Arrange phone tabs**, where you move cards between tabs, reorder them and hide them. That arrangement syncs to your other phones.
- **Big-screen view** (tablets and computers): the customizable grid, as before.
- **Touch controls** turn on automatically when you use a finger or pen, and mouse controls come back when you use a mouse, so 2-in-1 laptops switch by themselves. With touch, buttons are finger-sized and nothing hides behind hover. **Swipe a row right** to complete it (tasks, shopping, chores, bills), **swipe left** to delete it (with Undo). Press and hold for half a second to reorder.
- **Wall display mode** (for a mounted tablet): keeps the screen awake, refreshes weather and news every 15 minutes, rolls over to the new date at midnight, and goes back to the top after 3 idle minutes.

## Voice add

In Quick add, tap **Speak** and say what you want:
- "add milk, eggs and rice to shopping" adds three Shopping items
- "buy paper towels" or "we're out of coffee" adds to Shopping
- "remind me to call the plumber" adds a To-Do
- "note the wifi password is on the fridge" adds a Note
- "add dentist to the calendar" fills in an event and waits for you to pick the date

Anything else goes to the selected type. On Android, press and hold the app icon and choose **Voice add**. This needs a browser with speech recognition (Chrome, Edge or Safari); in other browsers the button doesn't appear.

## Text size

Settings → This device → **Text size**: Normal, Large or Extra large. It only affects that screen.

## Wall tablet extras

With Wall display mode on, Settings shows these options:
- **Screensaver** (Off, Clock or Photos) starts after 2, 5, 10 or 30 idle minutes. It shows a large clock, the date, the weather and the next event. Tap anywhere to close it; that tap doesn't press anything underneath.
- **Photos:** tap **Add photos** on the tablet to pick pictures from its gallery. They are resized to screen size and kept on that tablet only, so they are never synced or uploaded.
- **Night mode** (10 PM to 6 AM) switches to the dark theme and shows a dim clock instead of photos.

## Adding a device / signing out

**Add a device:** on any device that already syncs, open Settings → Sync → **Add a device**. On the new phone, tablet or computer, scan the QR code with the camera, or open the link (use **Send link** to text it). One tap sets it up: it unlocks, connects sync and pulls everything down, with no password or token to type. The key travels in the part of the link after `#`, which browsers never send to any website, and it's removed from the address bar and history right away.

On iPhone and iPad, a home-screen app has storage separate from Safari. Add the dashboard to the home screen first, open it, then paste the link in Settings → Sync → **Set up from another device**.

The code is a house key: anyone with it can see and change the dashboard. To cancel all links, delete the token on GitHub and connect one device again with a new token, then re-add the others.

**Sign out this device** (Settings → This device) saves any last changes to the cloud, then removes the dashboard, its sync key, settings and screensaver photos from that browser and locks it again. Use it on a work computer you're leaving, or before giving away a phone. **Stop syncing on this device** (in Sync) disconnects sync but keeps the data here.
