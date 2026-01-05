# 🛍️ Shopee Sale Reminder Bot

A serverless Discord bot that automatically reminds your channel about monthly Shopee **N.N** sales (1.1, 2.2, 3.3, ... 12.12) at the perfect times.

## 📅 Reminder Schedule

For each monthly sale, the bot posts reminders:

- **7 days before** — "Start prepping those carts"
- **2 days before** — "Check your vouchers"
- **1 day before** — "Tomorrow's the day"
- **On the actual day** — Special hype message 🎉

All reminders fire at **10:00 AM Asia/Singapore time**.

## 🎯 How It Works

The bot runs as a **GitHub Actions scheduled workflow** (serverless, zero-infra). Every day at 02:00 UTC (10:00 SGT), it:

1. Calculates the next Shopee sale date (1.1, 2.2, 3.3, etc.)
2. Checks if today matches a reminder offset (T-7, T-2, T-1, T=0)
3. If yes → posts the appropriate message to Discord via webhook
4. If no → silent (no spam)

## 🚀 Setup

This bot uses **two separate workflows** (KM and UK) so each channel posts independently with its own failure tracking.

### 1. Create Discord Webhooks (one per channel)

**For KM channel:**
1. In your Discord server: **Server Settings → Integrations → Webhooks**
2. Click **New Webhook**
3. Pick the **KM channel** where reminders should post
4. Name it (e.g., `ShopeeSaleReminder-KM`)
5. **Copy Webhook URL** and keep it secret

**For UK channel:**
Repeat the same steps but pick the **UK channel** and copy that webhook URL.

### 2. Create GitHub Actions Environments

1. Push this repo to GitHub
2. Go to your repo: **Settings → Environments**
3. Click **New environment**, name it `km`, click **Configure environment**
4. Under **Environment secrets**, click **Add secret**:
   - Name: `DISCORD_WEBHOOK_URL`
   - Value: paste the **KM** webhook URL
   - Save
5. Go back to **Environments**, repeat for `uk`:
   - Create environment `uk`
   - Add secret `DISCORD_WEBHOOK_URL` with the **UK** webhook URL

Note: even though the secret is named `DISCORD_WEBHOOK_URL` in GitHub, each workflow maps it to a channel-specific env var (`DISCORD_WEBHOOK_URL_KM` / `DISCORD_WEBHOOK_URL_UK`) at runtime.

### 3. Enable GitHub Actions

Two workflows are configured:
- `.github/workflows/shopee-sale-reminder-km.yml` (KM channel)
- `.github/workflows/shopee-sale-reminder-uk.yml` (UK channel)

Both will run daily at 10:00 AM SGT once you push to GitHub.

## 🧪 Testing

### Test Locally (Fastest Feedback)

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Set up environment:**

   ```bash
   cp .env.example .env
   # Edit .env and paste BOTH webhook URLs (KM and UK)
   ```

3. **Dry run** (no Discord post, just logs):

   ```bash
   # Test KM channel
   bun run remind:km:dry

   # Test UK channel
   bun run remind:uk:dry
   ```

4. **Test specific dates** (simulate scenarios):

   ```bash
   # Simulate 2.2 sale day on KM channel (dry run)
   bun run remind:km:dry -- --date=2026-02-02

   # Simulate 1 week before 3.3 on UK channel (dry run)
   bun run remind:uk:dry -- --date=2026-02-26

   # 2 days before 4.4 on KM channel (dry run)
   bun run remind:km:dry -- --date=2026-04-02
   ```

5. **Real post** (actually sends to Discord):
   ```bash
   # Remove --dry-run to post for real
   bun run remind:km -- --date=2026-02-02
   ```

### Test GitHub Actions Workflows

**Test KM workflow:**
1. Go to your repo: **Actions → Shopee Sale Reminder (KM)**
2. Click **Run workflow** (dropdown)
3. **Optional inputs:**
   - `date`: test a specific date (e.g., `2026-02-02`)
   - `dry_run`: check the box to log only (no Discord post)
4. Click **Run workflow**
5. Check the logs to verify it posts to KM channel

**Test UK workflow:**
Repeat the same steps but select **Shopee Sale Reminder (UK)** to test the UK channel.

Both workflows run independently — if one fails, the other still posts.

## 📝 Message Examples

### 7 Days Before

```
🛒 Shopee 2.2 in 1 week. Prep your cart.
```

### 2 Days Before

```
🔥 Shopee 2.2 in 2 days. Check vouchers.
```

### 1 Day Before

```
⏰ Shopee 2.2 is tomorrow. Finalize your wishlist.
```

### The Day Of (Special)

```
🎉 TODAY IS SHOPEE 2.2! 🎉
Drop deals here. Checkout speedrun time. 🏃‍♂️💨
```

## 🛠️ Technical Stack

- **Runtime:** Bun 1.0+ (native TypeScript)
- **Date/time:** Luxon (timezone-safe)
- **Scheduler:** GitHub Actions cron (`0 2 * * *` = 02:00 UTC = 10:00 SGT)
- **Delivery:** Discord Incoming Webhooks (no bot token needed)

## 📊 Sale Dates

The bot automatically tracks these monthly sales:

- **1.1** (Jan 1) — New Year Sale
- **2.2** (Feb 2)
- **3.3** (Mar 3)
- **4.4** (Apr 4)
- **5.5** (May 5)
- **6.6** (Jun 6) — Mid-Year Sale
- **7.7** (Jul 7)
- **8.8** (Aug 8)
- **9.9** (Sep 9) — Super Shopping Day
- **10.10** (Oct 10)
- **11.11** (Nov 11) — Singles Day (biggest)
- **12.12** (Dec 12) — Year-End Sale

## 🤝 Contributing

PRs welcome! Ideas:

- Add support for other regional sale events
- Customize message templates
- Multi-channel support

## 📄 License

MIT — go wild, walang bayad yan.

---

**Pro tip:** Set a calendar reminder to check your wishlist 1 week before each sale. May the voucher gods be with you. 🙏
