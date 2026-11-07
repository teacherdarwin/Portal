# Classrooms — one-time setup (about 3 minutes)

Classrooms let you run several subjects side by side. Each classroom has its own
**class code**, its own members, its own resources (in the order you upload them),
its own announcements and its own grades.

Your current portal, Google Sheet and Apps Script keep working exactly as before.
Classrooms live in a small separate service so nothing you already have can be
damaged.

---

## Step 1 — Create the classroom service

1. Go to **script.google.com** and sign in with the same Google account that owns your sheet.
2. Click **New project**.
3. Delete the sample `function myFunction() {}` and paste the whole of
   **`classrooms/Classrooms.gs`** from this folder.
4. Click **Save** (💾) and name the project `MathClass Classrooms`.

## Step 2 — Deploy it

1. Click **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Fill it in exactly like this:
   - **Description:** MathClass classrooms v1
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*
4. Click **Deploy**, then **Authorize access** → choose your account → **Advanced**
   → **Go to MathClass Classrooms (unsafe)** → **Allow**.
   ("Unsafe" is just Google's wording for your own unpublished script.)
5. Copy the **Web app URL** — it ends with `/exec`.

**Test it:** paste that URL into a browser tab. You should see
`{"success":true,"service":"MathClass classrooms","version":"1.0.0"}`.
If you see a sign-in page instead, the access setting is not *Anyone* — fix Step 2.3.

## Step 3 — Connect the portal

1. Open **`index.html`** in any text editor (Notepad, TextEdit, VS Code).
2. Near the top you will find:

   ```js
   const CLASSROOM_URL = '';
   ```

3. Paste your `/exec` link between the quotes:

   ```js
   const CLASSROOM_URL = 'https://script.google.com/macros/s/AKfy…/exec';
   ```

4. Save, then upload `index.html` to your GitHub repository as usual.

That's it. The **Classrooms** tab appears for you and **My Classrooms** appears for students.

---

## How it works day to day

**You (teacher)**
1. **Classrooms → New classroom** → class name, subject, section.
2. A 6-character code is generated (e.g. `MATH7B`). Tap **Copy** and post it to the class.
3. Inside the classroom: **Resources**, **Announcements**, **Members**, **Grades**.
   Everything you add there is visible only to students of that classroom.
4. **New code** in the Members tab replaces the code — already-enrolled students stay enrolled.

**Your students**
1. Sign in → **My Classrooms** → type the code → **Join**.
2. The subject appears as a card. Opening it shows Overview, Curriculum,
   Assignments and My Grades — with the same look as the main portal.
3. Resources are listed **in the order you uploaded them** (numbered 1, 2, 3…).

## Where the data lives

The first time a classroom is created, a spreadsheet named
**"MathClass — Classrooms"** is created in your Google Drive, with tabs
`Classrooms`, `Members`, `Resources`, `Announcements`, `Grades`, `Progress`.
You can open it like any sheet — handy for checking who joined or printing a class list.
Please **do not rename the tabs or the first row**, or the service will stop finding its data.

## Updating the service later

If you ever edit `Classrooms.gs`:
**Deploy → Manage deployments → ✏️ (edit) → Version: New version → Deploy.**
The URL stays the same, so nothing in the portal needs to change.

## If something looks wrong

| What you see | What to do |
|---|---|
| "One-time setup needed" card | `CLASSROOM_URL` in `index.html` is still empty — do Step 3. |
| "Cannot reach the classroom service" | The deployment access is not **Anyone**, or the URL is missing `/exec`. |
| "No classroom matches that code" | Check the code in the classroom's Members tab; codes are not case-sensitive. |
| Classrooms tab is empty for a student | They must join with the code first; nobody is added automatically. |
| A student joined the wrong class | Remove them in **Members**, then tell them the right code. |

## A note on privacy

The portal identifies people with the account they signed in with, exactly like
your existing script does. Anyone who has the deployment link *and* a student's
internal ID could in principle read that student's classes, so keep the link out
of public pages, and remove students from a classroom when they leave the class.
