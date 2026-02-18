/**
 * Firestore directchat export script
 *
 * Prerequisites:
 *   npm i firebase-admin
 *   npm i -D tsx          (to run .ts directly)
 *
 * Usage:
 *   npx tsx scripts/export-directchat.ts [--outDir=out] [--limit=100]
 *
 * Auth (one of the two):
 *   A) Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   B) Set FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
 */

import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Timestamp } from "firebase-admin/firestore";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// ── Types ──────────────────────────────────────────────────────────

interface Room {
  id: string;
  createdAt: string | null;
  isunlimited: boolean | null;
  participants: string[];
}

interface Args {
  outDir: string;
  limit: number | null;
}

// ── CLI arg parsing ────────────────────────────────────────────────

function parseArgs(argv: string[]): Args {
  let outDir = "out";
  let limit: number | null = null;

  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--outDir=")) {
      outDir = arg.slice("--outDir=".length);
    } else if (arg.startsWith("--limit=")) {
      const n = Number(arg.slice("--limit=".length));
      if (!Number.isFinite(n) || n <= 0) {
        console.error("Error: --limit must be a positive integer");
        process.exit(1);
      }
      limit = Math.floor(n);
    }
  }

  return { outDir, limit };
}

// ── Firebase init ──────────────────────────────────────────────────

function initFirebase(): void {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credPathEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (jsonEnv) {
    let sa: ServiceAccount;
    try {
      sa = JSON.parse(jsonEnv) as ServiceAccount;
    } catch {
      console.error(
        "Error: FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.",
      );
      process.exit(1);
    }
    initializeApp({ credential: cert(sa) });
    return;
  }

  if (credPathEnv) {
    // firebase-admin automatically picks up GOOGLE_APPLICATION_CREDENTIALS
    initializeApp();
    return;
  }

  console.error(
    "Error: Provide either GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON.",
  );
  process.exit(1);
}

// ── Helpers ────────────────────────────────────────────────────────

function isTimestamp(v: unknown): v is Timestamp {
  return (
    v !== null &&
    typeof v === "object" &&
    typeof (v as Timestamp).toDate === "function"
  );
}

function toISOString(v: unknown): string | null {
  if (isTimestamp(v)) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return null;
}

const PHONE_PAIR_RE = /^(\+\d{10,15})(\+\d{10,15})$/;

function parseParticipantsFromId(id: string): string[] | null {
  const m = PHONE_PAIR_RE.exec(id);
  return m ? [m[1], m[2]] : null;
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ── Main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { outDir, limit } = parseArgs(process.argv);

  initFirebase();
  const db = getFirestore();

  let query: FirebaseFirestore.Query = db.collection("directchat");
  if (limit !== null) {
    query = query.limit(limit);
  }

  const snapshot = await query.get();

  const rooms: Room[] = [];
  const warnings: string[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();

    const createdAt = toISOString(data.createdAt);
    const isunlimited: boolean | null =
      typeof data.isunlimited === "boolean" ? data.isunlimited : null;
    let participants: string[] = Array.isArray(data.participants)
      ? (data.participants as unknown[]).map(String)
      : [];

    if (participants.length !== 2) {
      const parsed = parseParticipantsFromId(doc.id);
      if (parsed) {
        participants = parsed;
      } else {
        warnings.push(
          `Room ${doc.id}: participants length is ${participants.length} and ID is not parseable`,
        );
      }
    }

    rooms.push({ id: doc.id, createdAt, isunlimited, participants });
  }

  // Collect unique phone numbers from valid (length === 2) rooms only
  const numberSet = new Set<string>();
  for (const room of rooms) {
    if (room.participants.length === 2) {
      room.participants.forEach((p) => numberSet.add(p));
    }
  }
  const uniqueNumbers = [...numberSet].sort();

  // ── Write output ─────────────────────────────────────────────────

  const outPath = resolve(outDir);
  mkdirSync(outPath, { recursive: true });

  // rooms JSON
  writeFileSync(
    resolve(outPath, "directchat_rooms.json"),
    JSON.stringify(rooms, null, 2),
    "utf-8",
  );

  // numbers JSON
  writeFileSync(
    resolve(outPath, "directchat_numbers.json"),
    JSON.stringify(uniqueNumbers, null, 2),
    "utf-8",
  );

  // rooms CSV
  const roomsCsvHeader = "id,createdAt,isunlimited,p0,p1";
  const roomsCsvRows = rooms.map((r) => {
    const p0 = r.participants[0] ?? "";
    const p1 = r.participants[1] ?? "";
    return [r.id, r.createdAt ?? "", String(r.isunlimited ?? ""), p0, p1]
      .map(escapeCsv)
      .join(",");
  });
  writeFileSync(
    resolve(outPath, "directchat_rooms.csv"),
    [roomsCsvHeader, ...roomsCsvRows].join("\n"),
    "utf-8",
  );

  // numbers CSV
  const numbersCsvHeader = "phone";
  const numbersCsvRows = uniqueNumbers.map(escapeCsv);
  writeFileSync(
    resolve(outPath, "directchat_numbers.csv"),
    [numbersCsvHeader, ...numbersCsvRows].join("\n"),
    "utf-8",
  );

  // ── Summary (no sensitive data) ──────────────────────────────────

  console.log("Export complete:");
  console.log(`  roomsCount:         ${rooms.length}`);
  console.log(`  uniqueNumbersCount: ${uniqueNumbers.length}`);
  console.log(`  warningsCount:      ${warnings.length}`);
  console.log(`  outDir:             ${outPath}`);

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    warnings.forEach((w) => console.log(`  - ${w}`));
  }
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
