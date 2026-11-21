import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../");
dotenv.config({ path: path.join(projectRoot, ".env") });

const port = Number(process.env.PORT || 8080);

function getErrorChain(error) {
  const errors = [];
  const seen = new Set();
  const pending = [error];

  while (pending.length) {
    const current = pending.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    errors.push(current);
    if (current.cause) pending.push(current.cause);
    if (current.reason?.cause) pending.push(current.reason.cause);

    const servers = current.reason?.servers;
    if (servers) {
      for (const server of servers.values()) {
        if (server.error) pending.push(server.error);
        if (server.description?.error) pending.push(server.description.error);
      }
    }
  }

  return errors;
}

function describeStartupFailure(error) {
  if (error.code === "MONGODB_URI_MISSING") return "MONGODB_URI is missing from the project-root .env";
  if (error.code === "MONGODB_URI_PLACEHOLDER") return "MONGODB_URI still contains its password placeholder";

  const errors = getErrorChain(error);
  const codes = errors.map((item) => String(item.code || "").toUpperCase());
  const names = errors.map((item) => String(item.name || "").toLowerCase());
  const details = errors
    .map((item) => `${item.codeName || ""} ${item.name || ""} ${item.message || ""}`.toLowerCase())
    .join(" ");

  if (codes.includes("EADDRINUSE")) return `port ${port} is already in use`;
  if (
    codes.includes("18") ||
    codes.includes("8000") ||
    /authentication failed|bad auth|authenticationfailure|authenticationfailed/.test(details)
  ) {
    return "MongoDB authentication failed; verify the Atlas database username and password";
  }
  if (
    names.some((name) => name.includes("parse")) ||
    /invalid.*(uri|connection string)|(uri|connection string).*invalid/.test(details)
  ) {
    return "MongoDB URI is malformed; verify the scheme, encoded credentials, host, and database name";
  }
  if (codes.some((code) => ["ENOTFOUND", "EAI_AGAIN", "ETIMEOUT"].includes(code))) {
    return "MongoDB DNS/SRV lookup failed; verify DNS and the Atlas cluster hostname";
  }
  if (codes.some((code) => code.startsWith("ERR_SSL_")) || /tls alert|ssl routines/.test(details)) {
    return "MongoDB TLS handshake failed; the remote endpoint or network path aborted TLS negotiation";
  }
  if (
    names.some((name) => name.includes("serverselection") || name.includes("network")) ||
    /timeout|timed out|connection refused|network/.test(details)
  ) {
    return "MongoDB connection timed out or was refused; check Atlas IP access, outbound network rules, and cluster availability";
  }

  const errorType = error.name || "Error";
  const errorCode = error.code ? ` (${error.code})` : "";
  return `startup failed with ${errorType}${errorCode}; sensitive error details were withheld`;
}

function sanitizeErrorMessage(message) {
  let safeMessage = String(message || "")
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'`]+/gi, "[REDACTED_MONGODB_URI]");

  const uri = process.env.MONGODB_URI || "";
  const credentials = [];
  try {
    const parsed = new URL(uri);
    credentials.push(parsed.username, parsed.password);
    for (const value of [parsed.username, parsed.password]) {
      if (value) {
        try {
          credentials.push(decodeURIComponent(value));
        } catch {
          // Keep the encoded credential for redaction when it is malformed.
        }
      }
    }
  } catch {
    const match = uri.match(/^mongodb(?:\+srv)?:\/\/([^@/]+)@/i);
    if (match) credentials.push(...match[1].split(":"));
  }

  for (const credential of new Set(credentials.filter(Boolean))) {
    safeMessage = safeMessage.split(credential).join("[REDACTED]");
  }

  return safeMessage.slice(0, 1000);
}

function logStartupErrorDetails(error) {
  const summaries = new Map();
  for (const item of getErrorChain(error)) {
    const name = item.name || "Error";
    const code = item.code || item.codeName || "none";
    const message = sanitizeErrorMessage(item.message);
    const key = `${name}|${code}|${message}`;
    const summary = summaries.get(key) || { name, code, message, count: 0 };
    summary.count += 1;
    summaries.set(key, summary);
  }

  for (const { name, code, message, count } of [...summaries.values()].slice(0, 8)) {
    console.error(
      `Startup error detail: name=${name} code=${code} occurrences=${count} message=${message || "(empty)"}`
    );
  }
}

async function start() {
  await connectDatabase();

  const server = await new Promise((resolve, reject) => {
    const httpServer = createApp().listen(port, () => resolve(httpServer));
    httpServer.once("error", reject);
  });

  console.log(`API listening on port ${port}.`);

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received; closing the HTTP server.`);

    server.close(async (error) => {
      if (error) {
        console.error("HTTP server did not close cleanly.");
        process.exitCode = 1;
      }

      try {
        await disconnectDatabase();
      } catch {
        console.error("MongoDB connection did not close cleanly.");
        process.exitCode = 1;
      }
    });
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch(async (error) => {
  console.error(`Server startup failed: ${describeStartupFailure(error)}.`);
  logStartupErrorDetails(error);
  try {
    await disconnectDatabase();
  } catch {
    console.error("MongoDB cleanup after startup failure did not complete.");
  }
  process.exitCode = 1;
});
