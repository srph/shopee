# shopee

_Discord bot_ that reminds your channel about monthly Shopee **N.N** sales (1.1, 2.2, 3.3, ... 12.12).

## How?

It runs as a cron job every day and checks the current date. It sends a reminder 7d, 2d, 1d before, and on the actual day.

All reminders fire at **10:00 AM SGT** (02:00 UTC).

## Setup

### Prerequisites

Install [Bun](https://bun.sh) on your server:

```bash
curl -fsSL https://bun.sh/install | bash
```

### 1. Clone and install

```bash
bun install
```

### 2. Configure webhook

```bash
cp .env.example .env
```

Edit `.env` and set `DISCORD_WEBHOOK_URL` to your channel's webhook URL.

To create a webhook: **Discord Server Settings > Integrations > Webhooks > New Webhook**, pick the channel, copy URL.

### 3. Add Forge Scheduled Job

In **Forge > Server > Scheduler**, create a job:

- **Command:** `cd /home/forge/shopee && ~/.bun/bin/bun run src/remind.ts`
- **User:** `forge`
- **Frequency:** Custom — `0 2 * * *`

## Testing

**Dry run** (no Discord post, just logs):

```bash
bun run remind:dry
```

**Test a specific date:**

```bash
bun run remind:dry -- --date=2026-03-03
```

**Post for real:**

```bash
bun run remind -- --date=2026-03-03
```