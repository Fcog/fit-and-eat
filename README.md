# Fit & Eat website

Built with [Eleventy](https://www.11ty.dev/). Each page is written once and Eleventy generates the
English (`/`), German (`/de/`) and Dutch (`/nl/`) versions when Netlify deploys.

## Project structure

| Path | What it is |
| --- | --- |
| `src/index.njk`, `src/build-my-plan.njk`, `src/plan-ready.njk` | The three pages (one file each, for all languages). |
| `src/_includes/layouts/base.njk` | Shared page shell: `<head>`, menu, footer. |
| `src/_includes/partials/` | Menu, footer, language switcher and logos. |
| `src/_i18n/de.json`, `src/_i18n/nl.json` | German and Dutch translations. |
| `src/_data/languages.json` | The list of languages and their URL prefixes. |
| `src/assets/css/` | `base.css` (shared) + one stylesheet per page. |
| `eleventy.config.js` | Eleventy settings and the `t` translation filter. |
| `netlify/functions/submit-plan.mjs` | Saves the form to Netlify Database. |
| `netlify/database/migrations/` | Database tables (run automatically on deploy). |
| `netlify/edge-functions/language.js` | Sends visitors to the right language. |

## Working on the site

```bash
npm install
npm run dev      # Eleventy only, at http://localhost:8080 (no form/database/geo)
npm run start    # netlify dev: site + functions + database + edge functions
npm run build    # builds everything into _site/
```

## Editing text and translations

Text in the templates is written in English and wrapped like this:

```njk
<h1>{{ "Tell us a little about you" | t(lang.code) }}</h1>
```

The English text is also the key in `src/_i18n/de.json` and `src/_i18n/nl.json`:

```json
"Tell us a little about you": "Erzähl uns ein wenig über dich"
```

- **Change German or Dutch wording:** edit the value in the JSON file.
- **Change English wording:** change it in the template *and* rename the key in both JSON files.
- **Add new text:** wrap it with `| t(lang.code)` and add the key to both JSON files.
  If you forget, the build prints `[i18n] Missing de translation: "..."` and shows English.
- **Add a language:** add it to `src/_data/languages.json`, create `src/_i18n/<code>.json`,
  add it to `eleventy.config.js` and to `LANGS` in the edge function.

## Before you start

- Netlify Database only works on Netlify's **credit-based plans**.
- **Drag-and-drop deploys won't work**, because Eleventy, the function and the database migration
  need a build. Use option A or B below.

## Option A – Deploy from GitHub (recommended)

1. Put this folder in a GitHub repository.
2. In Netlify: **Add new project → Import an existing project** → pick the repository
   (or, for your existing site: **Project configuration → Build & deploy → Link repository**).
3. Build settings come from `netlify.toml` (`npm run build`, publish `_site`).
4. Deploy. Netlify installs the package, creates the database, runs the migration and publishes the site.

## Option B – Deploy from your computer with the Netlify CLI

```bash
npm install -g netlify-cli
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

## Email notifications (Resend)

Every submission is also emailed to **svetla.georg@gmail.com** (`netlify/lib/notify-email.mjs`).
If the email fails, the submission is still saved and the visitor still sees the thank-you page.

1. Create a free account at [resend.com](https://resend.com) and create an API key.
2. In Netlify: **Project configuration → Environment variables**, add:
   - `RESEND_API_KEY` = your key (required)
   - `NOTIFY_EMAIL` = who gets the emails, comma-separated (optional, default svetla.georg@gmail.com)
   - `FROM_EMAIL` = sender, e.g. `Fit & Eat <hello@your-domain.com>` (optional)
3. Redeploy.

Without your own domain, Resend's test sender (`onboarding@resend.dev`) only delivers to the email
address of the Resend account itself. So either create the Resend account with svetla.georg@gmail.com,
or verify a domain in Resend and set `FROM_EMAIL` to an address on it.

## Languages (English, German, Dutch)

- English pages are at `/`, German at `/de/`, Dutch at `/nl/` (all generated from the same templates).
- `netlify/edge-functions/language.js` picks the language on each visit:
  1. A choice made with the EN / DE / NL switcher (saved in a `lang` cookie for a year).
  2. Otherwise the visitor's country from their IP: Germany → German, Netherlands → Dutch, everyone else → English.
- Opening `/de/` or `/nl/` directly always shows that language.
- The form sends the language along, so visitors land on the thank-you page in their language, and it's saved in the `lang` column.
- To add more countries (e.g. Austria, Switzerland, Belgium), edit `COUNTRY_TO_LANG` in the edge function.
- Have a native speaker review `src/_i18n/de.json` and `nl.json` before launch.

## Privacy (GDPR) notes

- The health check and limitations are special-category health data. The form asks for explicit
  consent, and the time of consent is saved in `consent_at`.
- Pick an **EU region** for the database if you can (it follows your project's functions region),
  and mention Netlify as a processor in your privacy policy.
- Delete a person's data on request:
  `DELETE FROM plan_requests WHERE email = 'person@example.com';`
