#!/usr/bin/env node
import { DateTime } from "luxon";

// Parse CLI args
const args = process.argv.slice(2);
const dateOverride = args
  .find((arg) => arg.startsWith("--date="))
  ?.split("=")[1];
const dryRun = args.includes("--dry-run");
const channel = args.find((arg) => arg.startsWith("--channel="))?.split("=")[1];

const TIMEZONE = "Asia/Singapore";

function getWebhookUrl(): string | undefined {
  const km = process.env.DISCORD_WEBHOOK_URL_KM;
  const uk = process.env.DISCORD_WEBHOOK_URL_UK;

  const normalizedChannel = channel?.toLowerCase();

  if (normalizedChannel === "km") return km;
  if (normalizedChannel === "uk") return uk;
  if (normalizedChannel) {
    throw new Error(
      `Invalid --channel value: "${channel}". Expected --channel=km or --channel=uk.`
    );
  }

  throw new Error("Missing --channel. Use --channel=km or --channel=uk.");
}

const WEBHOOK_URL = getWebhookUrl();

interface SaleDate {
  month: number;
  day: number;
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

/**
 * Generate the 12 monthly Shopee sale dates (1.1, 2.2, ..., 12.12)
 */
function getSaleDates(): SaleDate[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    day: i + 1,
  }));
}

/**
 * Find the next upcoming Shopee sale date from a given reference date
 */
function findNextSaleDate(referenceDate: DateTime): DateTime {
  const saleDates = getSaleDates();
  const currentYear = referenceDate.year;

  // Check current year
  for (const sale of saleDates) {
    const saleDate = DateTime.fromObject(
      { year: currentYear, month: sale.month, day: sale.day },
      { zone: TIMEZONE }
    );
    if (saleDate >= referenceDate) {
      return saleDate;
    }
  }

  // If no sale found in current year, return first sale of next year (1.1)
  return DateTime.fromObject(
    { year: currentYear + 1, month: 1, day: 1 },
    { zone: TIMEZONE }
  );
}

/**
 * Get the message for a given offset and sale date
 */
function getMessage(offset: number, saleDate: DateTime): string {
  const saleName = saleDate.toFormat("M.M");
  const formattedDate = saleDate.toFormat("MMMM d, yyyy");

  switch (offset) {
    case 7:
      return `🛒 **Heads up:** Shopee **${saleName}** sale is in **1 week** (on ${formattedDate})! Start prepping those carts and wishlists. 🎯`;
    case 2:
      return `🔥 **Shopee ${saleName}** sale in **2 days** (${formattedDate})! Check your vouchers and stackable deals. Don't sleep on this! 💰`;
    case 1:
      return `⏰ **Tomorrow is Shopee ${saleName}** (${formattedDate})! Last chance to finalize your wishlist. Don't sleep on those vouchers! 🚨`;
    case 0:
      return `🎉 **TODAY IS SHOPEE ${saleName}!** 🎉\n\nIt's go time! Drop your best deals in this channel. Time to speedrun that checkout. May the fastest clickers win! 🏃‍♂️💨\n\n*Bili na, walang awa!* 🛍️`;
    default:
      return "";
  }
}

/**
 * Post message to Discord webhook
 */
async function postToDiscord(message: string): Promise<void> {
  if (!WEBHOOK_URL) {
    throw new Error(
      "Discord webhook URL is not set. Provide DISCORD_WEBHOOK_URL_KM or DISCORD_WEBHOOK_URL_UK (and optionally --channel=km|uk)."
    );
  }

  const response = await fetch(WEBHOOK_URL, {
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

/**
 * Main execution
 */
async function main() {
  if (dryRun) {
    console.log(
      "🏃 DRY RUN: No Discord message will be posted (preview + logs only)."
    );
  }

  // Determine "today" in SGT
  const today = dateOverride
    ? DateTime.fromISO(dateOverride, { zone: TIMEZONE }).startOf("day")
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
