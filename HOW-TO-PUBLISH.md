# MathClass v9 — how to publish it and put it on your students' phones

## 1. What is in this folder

| File | What it is |
|---|---|
| `index.html` | The whole portal (replaces your current one) |
| `manifest.webmanifest` | Tells phones the app's name, icon and colours — this is what makes it installable |
| `sw.js` | Works "behind the scenes": keeps a copy of the app on the phone so it opens fast and still opens with a weak signal |
| `assets/` | The school seal at proper sizes + the campus photo. **Upload this folder too, with the same name.** |

Your Google Sheet and Apps Script code are **not** touched. The portal talks to
the same deployment as before, so all existing accounts, resources, announcements
and grades keep working.

## 2. Publishing to GitHub Pages

1. Open your repository: `github.com/teacherdarwin/Student-Portal`
2. Click **Add file → Upload files**.
3. Drag in `index.html`, `manifest.webmanifest`, `sw.js`, and the whole `assets` folder.
   - Dropping the folder keeps its name. The page looks for `assets/logo-96.png`,
     so the folder must be called exactly `assets`.
4. Write a short message like `Portal v9 with install support` and click **Commit changes**.
5. Wait about a minute, then open `https://teacherdarwin.github.io/Student-Portal/`.

If the page still looks like the old one, press **Ctrl + Shift + R**
(Cmd + Shift + R on Mac) once to force a refresh.

## 3. Installing it on a phone

The portal has to be opened **once** in the browser before it can be installed.

**Android (Chrome, Edge, Samsung Internet)**
1. Open the portal link.
2. Tap the **⋮** menu → **Install app** (or **Add to Home screen**).
   You can also tap **Install app** inside the portal's sidebar or dashboard banner.
3. Confirm. The NCC seal appears on the home screen and opens full screen.

**iPhone / iPad (must be Safari)**
1. Open the portal link in Safari.
2. Tap the **Share** button → **Add to Home Screen**.
3. Tap **Add**.

**Laptop / desktop (Chrome or Edge)**
- Click the small install icon at the right end of the address bar, or use the
  **Install app** button inside the portal.

Once installed there is **no APK to download or update** — the app always loads
the latest version from the site. This works on iPhone too.

## 4. What students and you get in v9

**Students**
- One-tap home-screen app that opens full screen, remembers the sign-in.
- Notification bell with announcements and upcoming deadlines.
- "Up Next" list with live countdowns (Due in 3h / Due in 2d).
- Term progress bar and a "Due this week" counter.
- Grades with DepEd-style descriptors (Outstanding, Very satisfactory, …) and
  a **Print / Save PDF** report card.

**You (faculty)**
- **Class Analytics** tab: class average, passing rate, students still ungraded,
  average per section, grade distribution, and a "Needs support" list (below 75).
- **Export CSV** of all grades (opens in Excel / Google Sheets).
- Notification bell for your own announcements and open deadlines.

**Both**
- Works offline once opened (shows the saved copy, data refreshes when back online).
- Install button in the sidebar / menu, and a phone-friendly layout with notch-safe spacing.
- Live "a new version is ready → Reload" bar instead of silent stale pages.

## 5. Updating it later

When you change anything in `index.html`, also open `sw.js` and change the first line:

```js
const VERSION = 'v9.0.0';   →   const VERSION = 'v9.1.0';
```

That tells every installed phone there is a new version; teachers and students
will see a small "A new version is ready — Reload" bar and update with one tap.
If you forget, phones may keep showing the old copy for a while.

## 6. Optional clean-up

- `NCC.png` in the repository is an 11 MB image. The portal now uses
  `assets/logo-96.png` (23 KB) and `assets/logo-256.png`, so you can delete
  `NCC.png` from the repository to save space — but only if `monitor.html` /
  `studenttest.html` do not use it.
- The app's name on the home screen comes from `short_name` in
  `manifest.webmanifest` (currently "MathClass").
