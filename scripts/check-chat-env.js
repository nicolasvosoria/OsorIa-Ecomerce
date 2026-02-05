/**
 * Comprueba que .env.local tenga las variables necesarias para el chat (catálogo).
 * Ejecutar: node scripts/check-chat-env.js
 * No muestra valores, solo si cada variable está definida o no.
 */

const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

console.log("Archivo:", envPath);
console.log("Existe .env.local:", fs.existsSync(envPath));
console.log("");

if (!fs.existsSync(envPath)) {
  console.log("Crea .env.local en la raíz del proyecto con:");
  required.forEach((k) => console.log("  " + k + "=..."));
  process.exit(1);
}

const content = fs.readFileSync(envPath, "utf-8");
const keys = new Set();
for (const line of content.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      keys.add(key);
    }
  }
}

let ok = true;
required.forEach((key) => {
  const present = keys.has(key);
  console.log(present ? "  OK  " : "  FALTA  ", key);
  if (!present) ok = false;
});

if (!ok) {
  console.log("");
  console.log("Añade las variables que faltan en .env.local.");
  console.log("Nombre exacto (sensible a mayúsculas): SUPABASE_SERVICE_ROLE_KEY");
  console.log("Luego reinicia el servidor: npm run dev");
  process.exit(1);
}
console.log("");
console.log("Todas las variables están presentes. Reinicia el servidor si acabas de editarlas.");
