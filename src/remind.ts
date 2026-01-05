#!/usr/bin/env node
import { DateTime } from "luxon";

// Parse CLI args
const args = process.argv.slice(2);
const dateOverride = args
  .find((arg) => arg.startsWith("--date="))
  ?.split("=")[1];
const dryRun = args.includes("--dry-run");

const TIMEZONE = "Asia/Singapore";
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

interface SaleDate {
  month: number;
  day: number;
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
    throw new Error("DISCORD_WEBHOOK_URL environment variable is not set");
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
  console.log(`\n📝 Message to send:\n${message}\n`);

  if (dryRun) {
    console.log("🏃 DRY RUN: Message not posted to Discord");
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
