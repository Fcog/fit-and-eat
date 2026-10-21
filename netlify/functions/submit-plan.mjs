// Receives the "Free sample week" form (build-my-plan.html),
// saves it to Netlify Database, then sends the visitor to plan-ready.html.
import { getDatabase } from "@netlify/database";

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

  // Spam trap: real visitors never see or fill this field.
  if (text(form, "company", 100)) return redirect("/plan-ready.html");

  const firstName = text(form, "name", 80);
  const email = text(form, "email", 200);
  const healthConsent = form.get("health_consent") === "on";
  const terms = form.get("terms") === "on";

  if (!firstName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !healthConsent || !terms) {
    return new Response(
      "Please go back and fill in your name, a valid email, and both consent boxes.",
      { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const healthFlags = many(form, "flag");
  const needsDoctor = healthFlags.some((f) => f !== "none");
  const minutes = one(form, "time");
  const cook = one(form, "cook");

  try {
    await db.sql`
      INSERT INTO plan_requests (
        first_name, email, age_range, goal_track, fitness_level,
        limitations, equipment, daily_minutes,
        diet, cook_minutes, allergies, dislikes,
        health_flags, needs_doctor, wants_group,
        health_consent, terms_accepted, newsletter
      ) VALUES (
        ${firstName}, ${email.toLowerCase()}, ${one(form, "age")}, ${one(form, "track")}, ${one(form, "level")},
        ${JSON.stringify(many(form, "limit"))}::jsonb, ${JSON.stringify(many(form, "equip"))}::jsonb, ${minutes ? Number(minutes) : null},
        ${one(form, "diet")}, ${cook ? Number(cook) : null}, ${JSON.stringify(many(form, "avoid"))}::jsonb, ${text(form, "dislikes", 300)},
        ${JSON.stringify(healthFlags)}::jsonb, ${needsDoctor}, ${form.get("group") === "yes"},
        ${healthConsent}, ${terms}, ${form.get("newsletter") === "on"}
      )
    `;
  } catch (err) {
    console.error("Could not save plan request:", err);
    return new Response("Sorry, something went wrong. Please try again in a moment.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return redirect("/plan-ready.html");
};

export const config = {
  path: "/api/submit-plan",
};
