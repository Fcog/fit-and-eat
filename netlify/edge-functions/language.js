// Picks the site language for each visitor.
//
// 1. ?lang=en|de|nl (from the language switcher) -> remember it in a cookie and go to that version.
// 2. A saved choice in the "lang" cookie always wins.
// 3. Otherwise use the visitor's country (from their IP):
//    Germany -> German, Netherlands -> Dutch, everyone else -> English.
//
// English lives at /, German at /de/, Dutch at /nl/.

const LANGS = ["en", "de", "nl"];
const COUNTRY_TO_LANG = { DE: "de", NL: "nl" };
const PAGES = ["", "index.html", "build-my-plan.html", "plan-ready.html", "index", "build-my-plan", "plan-ready"];
const COOKIE = "lang";
const ONE_YEAR = 60 * 60 * 24 * 365;

function parsePath(pathname) {
  const m = pathname.match(/^\/(de|nl)(\/.*)?$/);
  const lang = m ? m[1] : "en";
  const page = (m ? m[2] || "/" : pathname).replace(/^\//, "");
  return { lang, page };
}

const pathFor = (lang, page) =>
  (lang === "en" ? "/" : `/${lang}/`) + (page === "index.html" || page === "index" ? "" : page);

function redirect(url, location) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL(location, url).toString(),
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
    },
  });
}

export default async (request, context) => {
  const url = new URL(request.url);
  const { lang: current, page } = parsePath(url.pathname);
  if (!PAGES.includes(page)) return; // not one of our pages

  // 1. Explicit choice from the language switcher
  const chosen = url.searchParams.get("lang");
  if (LANGS.includes(chosen)) {
    context.cookies.set({
      name: COOKIE,
      value: chosen,
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "Lax",
      secure: url.protocol === "https:",
    });
    return redirect(url, pathFor(chosen, page));
  }

  // Only auto-redirect from the English (default) URLs.
  // Someone who opens /de/ or /nl/ directly gets that version.
  if (current !== "en") return;

  // 2. Saved choice, 3. country from IP
  const saved = context.cookies.get(COOKIE);
  const country = context.geo?.country?.code;
  const preferred = LANGS.includes(saved) ? saved : COUNTRY_TO_LANG[country] || "en";

  if (preferred !== "en") return redirect(url, pathFor(preferred, page));
  return; // English: serve the page as normal
};

export const config = {
  path: ["/", "/index.html", "/build-my-plan.html", "/plan-ready.html", "/build-my-plan", "/plan-ready", "/de/*", "/nl/*"],
};
