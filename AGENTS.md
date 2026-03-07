shopee is a cron-scheduled script to send a Discord message during Shopee sale weeks

- `bun install` to install
- `bun run remind:dry` to test on current date
- `bun run remind:dry -- date=YYYY-MM-DD` to test on given date
- `bun run remind` to send a real discord message based on current date
- `bun run remind -- date=YYYY-MM-DD` to send a real discord message based on given date