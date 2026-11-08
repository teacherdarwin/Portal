# MathClass v10 — publishing it, installing it, and running classrooms

## 1. What is in this folder

| File | What it is |
|---|---|
| `index.html` | The whole portal (replaces your current one) |
| `manifest.webmanifest` | App name, icon and colours — this is what makes it installable |
| `sw.js` | Keeps a copy on the phone so it opens fast and works on weak signal |
| `assets/` | The school seal at proper sizes + the campus photo. **Upload this folder too, same name.** |
| `classrooms/Classrooms.gs` | Optional: the classroom engine (see CLASSROOM-SETUP.md) |
| `CLASSROOM-SETUP.md` | Step-by-step for turning classrooms on |
| `HOW-TO-PUBLISH.md` | This file |

Your Google Sheet and the Apps Script that holds your data are **not modified**.

## 2. Publishing to GitHub Pages

1. Open `github.com/teacherdarwin/Student-Portal`.
2. **Add file → Upload files**.
3. Drag in `index.html`, `manifest.webmanifest`, `sw.js`, and the whole `assets` folder.
   - The folder must stay named `assets` — the page looks for `assets/logo-96.png`.
4. Commit, wait a minute, open the site. If it looks old, press **Ctrl + Shift + R** once.

## 3. Installing on a phone

**Android:** open the site → **⋮** menu → **Install app** (or **Add to Home screen**).
**iPhone/iPad:** open in **Safari** → **Share** → **Add to Home Screen** → **Add**.
**Laptop:** the install icon at the end of the address bar.

No APK to download or update — installed copies always load the newest version.

## 4. What the portal does now

**Students**
- Installable app, offline shell, remembered sign-in.
- Notification bell, "Up Next" countdowns, term progress, "Due this week".
- Grades with DepEd descriptors and a **Print / Save PDF** report card.
- **My Classrooms** — join a subject with the teacher's 6-character code; inside it are
  Overview, Curriculum, Assignments and My Grades for that subject only. Those four
  shortcuts only appear once a subject is open.
- **React and comment** on classroom announcements.

**You (faculty)**
- **Classrooms** — create a classroom, get a code, add resources (students see them in
  upload order), post announcements, see who enrolled.
- **Grade sheet** — every enrolled student in one table, a column per term, filtered by
  section, lowest average first; type a grade and it saves. Export any sheet to CSV.
- **Submissions** — a Drive folder is created under each student's name the first time
  they submit, listed alphabetically and filterable by section.
- **Class Analytics** — class average, passing rate, per-section average, distribution,
  and a "Needs support" list under 75.
- **Export CSV** of grades for any classroom.

## 5. Turning classrooms on

Classrooms need one small extra service, because your existing spreadsheet has no
concept of a class. It takes about three minutes and cannot damage what you have:

1. Follow `CLASSROOM-SETUP.md` (paste `classrooms/Classrooms.gs` into a new Apps Script,
   deploy as a web app, copy the `/exec` link).
2. Paste that link into `CLASSROOM_URL` near the top of `index.html`.
3. Upload `index.html` again.

If you skip this, everything else still works and the Classrooms tab simply shows a
"one-time setup needed" card.

## 6. Updating it later

When you change `index.html`, also bump the first line of `sw.js`:

```js
const VERSION = 'v10.0.0';   →   const VERSION = 'v10.1.0';
```

Installed phones then show a small "A new version is ready — Reload" bar and update in
one tap. If you edit `Classrooms.gs`, redeploy it with
**Deploy → Manage deployments → ✏️ → New version** (the link stays the same).

## 7. Optional clean-up

`NCC.png` (11 MB) is no longer used by the portal — delete it from the repository if
`monitor.html` / `studenttest.html` do not need it. The home-screen name comes from
`short_name` in `manifest.webmanifest`.
