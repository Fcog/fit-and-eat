// Receives the "Free sample week" form (build-my-plan.html),
// saves it to Netlify Database, then sends the visitor to plan-ready.html.
import { getDatabase } from "@netlify/database";
import { notifyNewRequest } from "../lib/notify-email.mjs";

const db = getDatabase();

const ALLOWED = {
  age: ["u40", "40s", "50s", "60s", "70plus"],
  track: ["stronger", "weight", "move"],
  level: ["beginner", "some", "active"],
  limit: ["knees", "hips", "back", "shoulders", "wrists", "balance", "floor", "none"],
  equip: ["none", "chair", "band", "dumbbells"],
  time: ["10", "20", "30"],
  diet: ["all", "flexitarian", "pescatarian", "vegetarian", "vegan", "pork"],
  cook: ["15", "30", "45"],
  avoid: ["gluten", "lactose", "nuts", "eggs", "fish", "soy", "none"],
  flag: ["heart", "chest", "surgery", "joint", "meds", "pregnant", "none"],
};

// Keep only known values, so nothing unexpected reaches the database.
const one = (form, key) => {
  const v = form.get(key);
  return ALLOWED[key].includes(v) ? v : null;
};
const many = (form, key) => form.getAll(key).filter((v) => ALLOWED[key].includes(v));
const text = (form, key, max) => {
  const v = (form.get(key) || "").toString().trim();
  return v ? v.slice(0, max) : null;
};

const MESSAGES = {
  en: { invalid: "Please go back and fill in your name, a valid email, and both consent boxes.", error: "Sorry, something went wrong. Please try again in a moment." },
  de: { invalid: "Bitte geh zurück und gib deinen Namen, eine gültige E-Mail-Adresse und beide Einwilligungen an.", error: "Entschuldigung, da ist etwas schiefgelaufen. Bitte versuch es gleich noch einmal." },
  nl: { invalid: "Ga terug en vul je naam, een geldig e-mailadres en beide toestemmingen in.", error: "Sorry, er ging iets mis. Probeer het zo nog eens." },
};
const thanksPage = (lang) => (lang === "en" ? "/plan-ready.html" : `/${lang}/plan-ready.html`);

const redirect = (location) => new Response(null, { status: 303, headers: { Location: location } });

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let form;
  try {
    form = await req.formData();
  } catch {
    return new Response("Invalid form data", { status: 400 });
  }

  const lang = ["en", "de", "nl"].includes(form.get("lang")) ? form.get("lang") : "en";

  // Spam trap: real visitors never see or fill this field.
  if (text(form, "company", 100)) return redirect(thanksPage(lang));

  const firstName = text(form, "name", 80);
  const email = text(form, "email", 200);
  const healthConsent = form.get("health_consent") === "on";
  const terms = form.get("terms") === "on";

  if (!firstName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !healthConsent || !terms) {
    return new Response(
      MESSAGES[lang].invalid,
      { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const healthFlags = many(form, "flag");
  const minutes = one(form, "time");
  const cook = one(form, "cook");
  const entry = {
    firstName,
    email: email.toLowerCase(),
    lang,
    age: one(form, "age"),
    track: one(form, "track"),
    level: one(form, "level"),
    limitations: many(form, "limit"),
    equipment: many(form, "equip"),
    minutes: minutes ? Number(minutes) : null,
    diet: one(form, "diet"),
    cook: cook ? Number(cook) : null,
    allergies: many(form, "avoid"),
    dislikes: text(form, "dislikes", 300),
    healthFlags,
    needsDoctor: healthFlags.some((f) => f !== "none"),
    wantsGroup: form.get("group") === "yes",
    newsletter: form.get("newsletter") === "on",
  };

  try {
    await db.sql`
      INSERT INTO plan_requests (
        first_name, email, age_range, goal_track, fitness_level,
        limitations, equipment, daily_minutes,
        diet, cook_minutes, allergies, dislikes,
        health_flags, needs_doctor, wants_group,
        health_consent, terms_accepted, newsletter, lang
      ) VALUES (
        ${entry.firstName}, ${entry.email}, ${entry.age}, ${entry.track}, ${entry.level},
        ${JSON.stringify(entry.limitations)}::jsonb, ${JSON.stringify(entry.equipment)}::jsonb, ${entry.minutes},
        ${entry.diet}, ${entry.cook}, ${JSON.stringify(entry.allergies)}::jsonb, ${entry.dislikes},
        ${JSON.stringify(entry.healthFlags)}::jsonb, ${entry.needsDoctor}, ${entry.wantsGroup},
        ${healthConsent}, ${terms}, ${entry.newsletter}, ${entry.lang}
      )
    `;
  } catch (err) {
    console.error("Could not save plan request:", err);
    return new Response(MESSAGES[lang].error, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Email the team. The request is already saved, so a failed email never blocks the visitor.
  try {
    await notifyNewRequest(entry);
  } catch (err) {
    console.error("Could not send notification email:", err);
  }

  return redirect(thanksPage(lang));
};

export const config = {
  path: "/api/submit-plan",
};
