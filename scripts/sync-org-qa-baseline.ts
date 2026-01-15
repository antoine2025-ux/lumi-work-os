import fs from "fs/promises";
import path from "path";

type OrgQaStatus = "pass" | "partial" | "fail";

type ParsedSnapshotQuestion = {
  id: string;
  label: string;
  type: string;
  status: OrgQaStatus;
};

async function main() {
  const root = process.cwd();
  const qaDir = path.join(root, "docs", "org", "qa");

  let files: string[];
  try {
    files = await fs.readdir(qaDir);
  } catch (err) {
    console.error(
      "[org:qa:sync-baseline] Could not read docs/org/qa. Did you export a snapshot yet?"
    );
    console.error(err);
    process.exit(1);
  }

  const snapshotFiles = files
    .filter((f) => f.startsWith("org-qa-snapshot-") && f.endsWith(".md"))
    .sort();

  if (snapshotFiles.length === 0) {
    console.error(
      "[org:qa:sync-baseline] No snapshot files found in docs/org/qa."
    );
    process.exit(1);
  }

  const latestFile = snapshotFiles[snapshotFiles.length - 1];
  const latestPath = path.join(qaDir, latestFile);

  console.log(
    `[org:qa:sync-baseline] Using latest snapshot: docs/org/qa/${latestFile}`
  );

  const content = await fs.readFile(latestPath, "utf-8");

  const questions = parseQuestionsTable(content);

  if (!questions.length) {
    console.error(
      "[org:qa:sync-baseline] No questions parsed from snapshot questions table."
    );
    process.exit(1);
  }

  console.log(
    `[org:qa:sync-baseline] Parsed ${questions.length} questions from snapshot.`
  );
  console.log("");
  console.log(
    "//////////////////// PASTE INTO src/lib/loopbrain/org-qa-questions.ts ////////////////////"
  );
  console.log("");

  console.log("export const ORG_QA_QUESTIONS: OrgQaQuestion[] = [");

  for (const q of questions) {
    const safeLabel = q.label.replace(/"/g, '\\"').replace(/\n/g, " ");
    const notes = q.notes ? `, notes: "${q.notes.replace(/"/g, '\\"').replace(/\n/g, " ")}"` : "";
    console.log(
      `  { id: "${q.id}", label: "${safeLabel}", type: "${q.type}", status: "${q.status}"${notes} },`
    );
  }

  console.log("];");
  console.log("");
  console.log(
    "//////////////////////////////////////////////////////////////////////////////"
  );
  console.log("");
  console.log(
    "Next steps:\n" +
      "1. Copy the block above.\n" +
      "2. Replace the existing ORG_QA_QUESTIONS in src/lib/loopbrain/org-qa-questions.ts.\n" +
      "3. Commit the change along with the snapshot file."
  );
}

function parseQuestionsTable(markdown: string): Array<ParsedSnapshotQuestion & { notes?: string }> {
  const lines = markdown.split(/\r?\n/);

  const startIndex = lines.findIndex((line) =>
    line.trim().toLowerCase().startsWith("## questions")
  );
  if (startIndex === -1) return [];

  const result: Array<ParsedSnapshotQuestion & { notes?: string }> = [];

  // Table starts a couple of lines after "## Questions"
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];

    // Skip header/separator lines or empty lines
    if (!line.trim().startsWith("|")) continue;
    if (line.includes("| ID |") || line.match(/^\|\s*-+\s*\|/)) continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 4) continue;

    const [id, label, type, status, notes] = cells;

    if (!id || !status) continue;

    const normalizedStatus = status.toLowerCase() as OrgQaStatus;
    if (
      normalizedStatus !== "pass" &&
      normalizedStatus !== "partial" &&
      normalizedStatus !== "fail"
    ) {
      continue;
    }

    result.push({
      id,
      label,
      type,
      status: normalizedStatus,
      notes: notes && notes !== "-" ? notes : undefined,
    });
  }

  return result;
}

main().catch((err) => {
  console.error("[org:qa:sync-baseline] Unexpected error:", err);
  process.exit(1);
});

