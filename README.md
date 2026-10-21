# Fit & Eat – saving form submissions in Netlify Database

When someone sends the "Free sample week" form, a Netlify Function saves their answers in a
Netlify Database (Postgres) table called `plan_requests`, then shows them `plan-ready.html`.

## What's in this folder

| File | What it does |
| --- | --- |
| `index.html`, `build-my-plan.html`, `plan-ready.html`, `logo.svg` | The website. The form now posts to `/api/submit-plan`. |
| `netlify/functions/submit-plan.mjs` | Checks the answers and saves them to the database. |
| `netlify/database/migrations/0001_create_plan_requests.sql` | Creates the `plan_requests` table. Netlify runs it automatically on deploy. |
| `package.json` | Installs `@netlify/database`. |
| `netlify.toml` | Tells Netlify where the site and functions are. |

## Before you start

- Netlify Database only works on Netlify's **credit-based plans**.
- **Drag-and-drop deploys won't work** for this, because the function and the database migration
  need a build. Use option A or B below.

## Option A – Deploy from GitHub (recommended)

1. Put this folder in a GitHub repository.
2. In Netlify: **Add new project → Import an existing project** → pick the repository
   (or, for your existing site: **Project configuration → Build & deploy → Link repository**).
3. Leave the build command empty. Publish directory: `.`
4. Deploy. Netlify installs the package, creates the database, runs the migration and publishes the site.

## Option B – Deploy from your computer with the Netlify CLI

```bash
npm install -g netlify-cli
cd fit-and-eat-site
npm install
netlify login
netlify link          # choose your existing Fit & Eat site
netlify deploy --build --prod
```

## See the submissions

In Netlify, open your project → **Data & Storage → Database**. You can browse the `plan_requests`
table there, or run SQL such as:

```sql
SELECT created_at, first_name, email, goal_track, needs_doctor
FROM plan_requests
ORDER BY created_at DESC;
```

## Test it

1. Open your live site, fill in the form and send it.
2. You should land on the "Your sample week is on its way" page.
3. Check the table in **Data & Storage → Database** for the new row.

If something goes wrong, check **Logs → Functions → submit-plan** in Netlify.

## Privacy (GDPR) notes

- The health check and limitations are special-category health data. The form asks for explicit
  consent, and the time of consent is saved in `consent_at`.
- Pick an **EU region** for the database if you can (it follows your project's functions region),
  and mention Netlify as a processor in your privacy policy.
- Delete a person's data on request:
  `DELETE FROM plan_requests WHERE email = 'person@example.com';`
