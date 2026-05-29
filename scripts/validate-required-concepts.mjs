import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { csv: "tmp_frz_mapping_export.csv", manifest: "scripts/must-include-concepts.json" };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--csv" && argv[i + 1]) {
      args.csv = argv[i + 1];
      i += 1;
      continue;
    }
    if (a === "--manifest" && argv[i + 1]) {
      args.manifest = argv[i + 1];
      i += 1;
      continue;
    }
  }
  return args;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }
  out.push(cur);
  return out;
}

function loadCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = parseCsvLine(line);
    const row = {};
    for (let i = 0; i < headers.length; i += 1) {
      row[headers[i]] = (vals[i] ?? "").trim();
    }
    return row;
  });
}

function main() {
  const args = parseArgs(process.argv);
  const csvPath = path.resolve(process.cwd(), args.csv);
  const manifestPath = path.resolve(process.cwd(), args.manifest);

  if (!fs.existsSync(csvPath)) {
    console.error(`[guard] CSV not found: ${csvPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(manifestPath)) {
    console.error(`[guard] Manifest not found: ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const requiredConcepts = Array.isArray(manifest.requiredConcepts) ? manifest.requiredConcepts : [];
  if (requiredConcepts.length === 0) {
    console.error("[guard] Manifest has no requiredConcepts entries.");
    process.exit(1);
  }

  const rows = loadCsv(csvPath);
  if (rows.length === 0) {
    console.error("[guard] CSV has no data rows.");
    process.exit(1);
  }

  const requiredSchema = ["icd_code", "snomed_code", "snomed_term"];
  const missingSchema = requiredSchema.filter((col) => !(col in rows[0]));
  if (missingSchema.length > 0) {
    console.error(`[guard] CSV schema missing required columns: ${missingSchema.join(", ")}`);
    process.exit(1);
  }

  const failures = [];

  for (const req of requiredConcepts) {
    const code = String(req.snomed_code ?? "").trim();
    if (!code) {
      failures.push({
        snomed_code: "<empty>",
        issue: "manifest entry has empty snomed_code",
      });
      continue;
    }

    const conceptRows = rows.filter((r) => String(r.snomed_code).trim() === code);
    if (conceptRows.length === 0) {
      failures.push({
        snomed_code: code,
        issue: "missing concept in CSV",
      });
      continue;
    }

    const expectedLabels = Array.isArray(req.expected_labels_en) ? req.expected_labels_en.map((x) => String(x).trim().toLowerCase()) : [];
    if (expectedLabels.length > 0) {
      const labels = conceptRows.map((r) => String(r.snomed_term ?? "").trim().toLowerCase());
      const labelOk = expectedLabels.some((label) => labels.includes(label));
      if (!labelOk) {
        failures.push({
          snomed_code: code,
          issue: "expected label not found",
          expected_labels_en: req.expected_labels_en,
        });
      }
    }

    const icdHint = Array.isArray(req.icd_hint) ? req.icd_hint.map((x) => String(x).trim().toUpperCase()) : [];
    if (icdHint.length > 0) {
      const icdCodes = conceptRows.map((r) => String(r.icd_code ?? "").trim().toUpperCase());
      const icdOk = icdHint.some((h) => icdCodes.includes(h));
      if (!icdOk) {
        failures.push({
          snomed_code: code,
          issue: "ICD hint not found",
          icd_hint: req.icd_hint,
        });
      }
    }
  }

  if (failures.length > 0) {
    console.error("[guard] Required concept checks failed:");
    for (const f of failures) {
      console.error(`- ${f.snomed_code}: ${f.issue}`);
      if (f.expected_labels_en) {
        console.error(`  expected_labels_en=${JSON.stringify(f.expected_labels_en)}`);
      }
      if (f.icd_hint) {
        console.error(`  icd_hint=${JSON.stringify(f.icd_hint)}`);
      }
    }
    process.exit(1);
  }

  console.log(`[guard] OK. Verified ${requiredConcepts.length} required concept(s) against ${rows.length} row(s).`);
}

main();
