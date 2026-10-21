import fs from "node:fs";

// Translations: English text is the key, so templates stay readable.
// src/_i18n/de.json and nl.json map each English string to its translation.
const translations = {
  de: JSON.parse(fs.readFileSync("src/_i18n/de.json", "utf8")),
  nl: JSON.parse(fs.readFileSync("src/_i18n/nl.json", "utf8")),
};

export default function (eleventyConfig) {
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true });

  // {{ "Get my free sample week" | t(lang.code) }}
  eleventyConfig.addFilter("t", (text, lang) => {
    if (lang === "en" || !lang) return text;
    const value = translations[lang]?.[text];
    if (value === undefined) {
      console.warn(`[i18n] Missing ${lang} translation: "${text}"`);
      return text;
    }
    return value;
  });

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/logo.svg": "logo.svg" });
  eleventyConfig.addWatchTarget("src/_i18n/");

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
}
