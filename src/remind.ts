#!/usr/bin/env node
import { DateTime } from "luxon";

interface SaleDate {
  month: number;
  day: number;
}

const TIMEZONE = "Asia/Singapore";

//
// ===================================================================
//
// CLI utils
//
// ===================================================================
//

function parseArgs(): { date?: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  const date = args.find((arg) => arg.startsWith("--date="))?.split("=")[1];
  const dryRun = args.includes("--dry-run");
  return { date, dryRun };
}

function wrapText(text: string, width: number): string[] {
  const hardLines = text.split("\n");
  const out: string[] = [];

  for (const hardLine of hardLines) {
    const words = hardLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }

    let line = "";
    for (const word of words) {
      if (line.length === 0) {
        line = word;
        continue;
      }

      if (line.length + 1 + word.length <= width) {
        line = `${line} ${word}`;
      } else {
        out.push(line);
        line = word;
      }
    }
    if (line.length > 0) out.push(line);
  }

  return out;
}

function boxPreview(text: string, maxInnerWidth = 72): string {
  const lines = wrapText(text, maxInnerWidth);
  const innerWidth = Math.max(1, ...lines.map((l) => l.length));

  const top = `┌${"─".repeat(innerWidth + 2)}┐`;
  const bottom = `└${"─".repeat(innerWidth + 2)}┘`;
  const middle = lines.map((l) => `│ ${l.padEnd(innerWidth, " ")} │`);

  return [top, ...middle, bottom].join("\n");
}


//
// ===================================================================
//
// Sale utils
//
// ===================================================================
//

// Generate the 12 monthly Shopee sale dates (1.1, 2.2, ..., 12.12)
function getSaleDates(): SaleDate[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    day: i + 1,
  }));
}

// Find the next upcoming Shopee sale date from a given reference date
function findNextSaleDate(reference: DateTime): DateTime {
  const saleDates = getSaleDates();
  
  const currentYear = reference.year;

  // Check current year
  for (const sale of saleDates) {
    const saleDate = DateTime.fromObject(
      { year: currentYear, month: sale.month, day: sale.day },
      { zone: TIMEZONE }
    );
    
    if (saleDate >= reference) {
      return saleDate;
    }
  }

  // If no sale found in current year, return first sale of next year (1.1)
  return DateTime.fromObject(
    { year: currentYear + 1, month: 1, day: 1 },
    { zone: TIMEZONE }
  );
}

// Get the message for a given offset and sale date
function getMessage(offset: number, sale: DateTime): string {
  const saleName = sale.toFormat("M.M");
  
  const formattedDate = sale.toFormat("MMMM d, yyyy");

  switch (offset) {
    case 7:
      return `🛒 **Heads up:** Shopee **${saleName}** sale is in **1 week** 🦍`;
    case 2:
      return `🔥 **Shopee ${saleName}** sale in **2 days** (${formattedDate})! 🦖`;
    case 1:
      return `⏰ **Tomorrow is Shopee ${saleName}** (${formattedDate})! 🐛`;
    case 0:
      return `🎉 **TODAY IS SHOPEE ${saleName}!**`;
    default:
      return "";
  }
}

//
// ===================================================================
//
// Discord function
//
// ===================================================================
//
async function postToDiscord(message: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;

  if (!url) {
    throw new Error("Missing DISCORD_WEBHOOK_URL. Set it in your .env file.");
  }
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: message }),
  });

  if (!response.ok) {
    throw new Error(
      `Discord webhook failed: ${response.status} ${response.statusText}`
    );
  }
}

//
// ===================================================================
//
// Main execution flow
// parse -> get next sale date -> get relevant message -> post to discord
//
// ===================================================================
//
async function main() {
  const { date, dryRun } = parseArgs();

  console.log(`
  ▄██████▄   ██░░░██  ▄██████▄  ▄██████▄  ▄██████▄  ▄██████▄
  ██░░░░░██  ██░░░██  ██░░░░██  ██░░░░██  ██░░░░██  ██░░░░██
  ▀██████▄   ███████  ██░░░░██  ███████▀  ███████▀  ███████▀
       ░░██  ██░░░██  ██░░░░██  ██░░░░    ██░░░░    ██░░░░
  ▄██████▀   ██░░░██  ▀██████▀  ██░░      ▀██████▄  ▀██████▄
  `)

  if (dryRun) {
    console.log(
      "🏃 DRY RUN: No Discord message will be posted (preview + logs only)."
    );
  }

  // Determine "today" in SGT
  const today = date
    ? DateTime.fromISO(date, { zone: TIMEZONE }).startOf("day")
    : DateTime.now().setZone(TIMEZONE).startOf("day");

  console.log(`🕐 Reference date (SGT): ${today.toFormat("yyyy-MM-dd (ccc)")}`);

  // Find next sale date
  const nextSale = findNextSaleDate(today);
  const daysUntilSale = Math.round(nextSale.diff(today, "days").days);

  console.log(
    `📅 Next sale: ${nextSale.toFormat("yyyy-MM-dd")} (${nextSale.toFormat(
      "M.M"
    )})`
  );
  console.log(`📊 Days until sale: ${daysUntilSale}`);

  // Check if we should send a reminder
  const validOffsets = [7, 2, 1, 0];
  if (!validOffsets.includes(daysUntilSale)) {
    console.log(
      `✅ No reminder needed today (offset ${daysUntilSale} not in [7, 2, 1, 0])`
    );
    return;
  }

  const message = getMessage(daysUntilSale, nextSale);
  console.log("\n📝 Message preview:");
  console.log(boxPreview(message));
  console.log("");

  if (dryRun) {
    console.log("✅ Dry run complete (nothing posted).");
    return;
  }

  // Post to Discord
  console.log("📤 Posting to Discord...");
  await postToDiscord(message);
  console.log("✅ Message posted successfully!");
}

// Run
main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
