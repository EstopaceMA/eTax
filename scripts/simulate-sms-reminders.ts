import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { filingQuarters } from "@/lib/filing-periods";
import { sendSms } from "@/lib/emessage/sms";
import {
  applyReminderScenario,
  defaultReminderDays,
  evaluateReminders,
  getTodayInManila,
  parseReminderDays,
  type ReminderFiling,
  type ReminderScenario,
} from "@/lib/reminders";

type CliOptions = {
  asOfDate: string;
  days: number[];
  scenario: ReminderScenario;
  number: string;
  send: boolean;
  quarter: number | null;
};

const validScenarios = new Set<ReminderScenario>([
  "workspace",
  "not_generated",
  "generated_unpaid",
  "generated_paid_unfiled",
  "complete",
  "mixed",
]);

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);

    if (!match || process.env[match[1]]) {
      continue;
    }

    const value = match[2].trim().replace(/^['"]|['"]$/g, "");
    process.env[match[1]] = value;
  }
}

function argValue(args: string[], name: string) {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));

  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function parseOptions(args: string[]): CliOptions {
  const scenarioValue = argValue(args, "--scenario") ?? "mixed";
  const scenario = validScenarios.has(scenarioValue as ReminderScenario)
    ? (scenarioValue as ReminderScenario)
    : "mixed";
  const quarter = Number(argValue(args, "--quarter"));

  return {
    asOfDate: argValue(args, "--as-of") ?? getTodayInManila(),
    days: parseReminderDays(argValue(args, "--days") ?? defaultReminderDays.join(",")),
    scenario,
    number: argValue(args, "--number") ?? process.env.EMESSAGE_TEST_NUMBER ?? "",
    send: args.includes("--send"),
    quarter: Number.isInteger(quarter) && quarter >= 1 && quarter <= 4 ? quarter : null,
  };
}

function buildFixtureFilings(): ReminderFiling[] {
  return filingQuarters.map((quarter) => ({
    id: `fixture-${quarter.quarter}`,
    form_name: quarter.formTitle,
    period: quarter.period,
    due_date: quarter.dueDate,
    status: quarter.quarter === 2 ? "ready" : "draft",
    payment_status: "unpaid",
    generated_pdf_at: quarter.quarter === 2 ? "2026-08-01T00:00:00Z" : null,
  }));
}

async function main() {
  loadDotEnv();

  const options = parseOptions(process.argv.slice(2));
  const fixtureFilings = buildFixtureFilings().filter(
    (filing) => options.quarter === null || filing.id === `fixture-${options.quarter}`,
  );
  const scenarioFilings = applyReminderScenario(fixtureFilings, options.scenario);
  const evaluations = evaluateReminders({
    asOfDate: options.asOfDate,
    reminderDays: options.days,
    filings: scenarioFilings,
  });
  const sendable = evaluations.filter((item) => item.shouldSend);

  console.log("SMS reminder simulation");
  console.log(`as_of_date: ${options.asOfDate}`);
  console.log(`reminder_days: ${options.days.join(",")}`);
  console.log(`scenario: ${options.scenario}`);
  console.log(`mode: ${options.send ? "SEND REAL SMS" : "dry run"}`);
  console.log("");

  for (const item of evaluations) {
    console.log(`${item.shouldSend ? "SEND" : "SKIP"} | ${item.filing.period} | ${item.daysUntilDue} days | ${item.stateLabel}`);
    console.log(`reason: ${item.reason}`);
    console.log(`message: ${item.message ?? "No SMS needed."}`);
    console.log("");
  }

  console.log(`sendable_count: ${sendable.length}`);

  if (!options.send) {
    console.log("No SMS sent. Add --send to send the first sendable message.");
    return;
  }

  if (!options.number) {
    throw new Error("Missing --number or EMESSAGE_TEST_NUMBER.");
  }

  const first = sendable[0];

  if (!first?.message) {
    console.log("No sendable reminder found, so no SMS was sent.");
    return;
  }

  await sendSms({ number: options.number, message: first.message });
  console.log(`Sent one SMS to ${options.number} for ${first.filing.period}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
