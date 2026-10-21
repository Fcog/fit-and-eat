// Emails each new "Free sample week" request to the team, using Resend (https://resend.com).
//
// Netlify environment variables:
//   RESEND_API_KEY  (required)  API key from resend.com
//   NOTIFY_EMAIL    (optional)  who receives the emails, comma-separated
//   FROM_EMAIL      (optional)  sender, e.g. "Fit & Eat <hello@your-domain.com>"

const DEFAULT_TO = "svetla.georg@gmail.com";
const DEFAULT_FROM = "Fit & Eat <onboarding@resend.dev>"; // Resend's test sender

const LABELS = {
  age: { u40: "Under 40", "40s": "40–49", "50s": "50–59", "60s": "60–69", "70plus": "70+" },
  track: { stronger: "Get stronger", weight: "Lose weight, keep muscle", move: "Move without pain" },
  level: { beginner: "Just starting", some: "Somewhat active", active: "Regularly active" },
  limit: { knees: "Knees", hips: "Hips", back: "Lower back", shoulders: "Shoulders", wrists: "Wrists", balance: "Balance", floor: "Getting up from the floor", none: "Nothing" },
  equip: { none: "Nothing", chair: "Sturdy chair", band: "Resistance band", dumbbells: "Dumbbells" },
  diet: { all: "Everything", flexitarian: "Less meat", pescatarian: "Pescatarian", vegetarian: "Vegetarian", vegan: "Vegan", pork: "No pork" },
  avoid: { gluten: "Gluten", lactose: "Lactose", nuts: "Nuts", eggs: "Eggs", fish: "Fish & seafood", soy: "Soy", none: "None" },
  flag: { heart: "Heart condition or high blood pressure", chest: "Chest pain, faint or dizzy when active", surgery: "Surgery, fracture or serious injury (last 6 months)", joint: "Joint or bone problems that worsen with exercise", meds: "Medication affecting heart rate, blood pressure or balance", pregnant: "Pregnant or gave birth (last 6 months)", none: "None of these" },
  lang: { en: "English", de: "German", nl: "Dutch" },
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const label = (group, v) => (v ? LABELS[group]?.[v] ?? v : "—");
const list = (group, arr) => (arr?.length ? arr.map((v) => label(group, v)).join(", ") : "—");
const yesNo = (b) => (b ? "Yes" : "No");

export async function notifyNewRequest(e) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set, skipping notification email");
    return;
  }
  const to = (process.env.NOTIFY_EMAIL || DEFAULT_TO).split(",").map((s) => s.trim()).filter(Boolean);
  const from = process.env.FROM_EMAIL || DEFAULT_FROM;

  const rows = [
    ["Name", e.firstName],
    ["Email", e.email],
    ["Language", label("lang", e.lang)],
    ["Age", label("age", e.age)],
    ["Goal", label("track", e.track)],
    ["Level", label("level", e.level)],
    ["Limitations", list("limit", e.limitations)],
    ["Equipment", list("equip", e.equipment)],
    ["Minutes per day", e.minutes ?? "—"],
    ["Diet", label("diet", e.diet)],
    ["Max cooking time", e.cook ? `${e.cook} min` : "—"],
    ["Allergies / avoid", list("avoid", e.allergies)],
    ["Dislikes", e.dislikes || "—"],
    ["Health check", list("flag", e.healthFlags)],
    ["Wants a group", yesNo(e.wantsGroup)],
    ["Newsletter", yesNo(e.newsletter)],
  ];

  const warning = e.needsDoctor
    ? `<p style="background:#fdf0ec;border:1px solid #f3c3b6;border-radius:8px;padding:10px 12px;color:#b5381f"><b>Health flag:</b> this person ticked at least one health warning. Advise them to check with their doctor first.</p>`
    : "";

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#16241c;max-width:600px">
  <h2 style="margin:0 0 12px">New free sample week request</h2>
  ${warning}
  <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px">
    ${rows.map(([k, v]) => `<tr><td style="border-bottom:1px solid #e3ddcd;color:#5b6b61;width:170px;vertical-align:top">${esc(k)}</td><td style="border-bottom:1px solid #e3ddcd">${esc(v)}</td></tr>`).join("\n    ")}
  </table>
  <p style="font-size:12px;color:#5b6b61">Also saved in Netlify Database (plan_requests). Reply to this email to answer ${esc(e.firstName)} directly.</p>
</div>`;

  const textBody = rows.map(([k, v]) => `${k}: ${v}`).join("\n") + (e.needsDoctor ? "\n\nHEALTH FLAG: advise checking with a doctor first." : "");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      reply_to: e.email,
      subject: `New sample week request: ${e.firstName}${e.needsDoctor ? " (health flag)" : ""}`,
      html,
      text: textBody,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
  }
}
