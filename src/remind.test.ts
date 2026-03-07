import { describe, expect, test } from "bun:test";

async function runRemindDry(date: string): Promise<string> {
  const proc = Bun.spawn(
    ["bun", "run", "src/remind.ts", "--dry-run", `--date=${date}`],
    { stdout: "pipe", stderr: "pipe" }
  );
  const stdout = await new Response(proc.stdout).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`remind exited ${proc.exitCode}\nstderr: ${stderr}`);
  }
  return stdout;
}

describe("remind --dry-run", () => {
  test("sale day (offset 0) shows TODAY message", async () => {
    const out = await runRemindDry("2025-03-03");
    expect(out).toContain("TODAY IS SHOPEE 3.3");
  });

  test("1 day before (offset 1) shows Tomorrow message", async () => {
    const out = await runRemindDry("2025-03-02");
    expect(out).toContain("Tomorrow is Shopee 3.3");
  });

  test("2 days before (offset 2) shows 2 days message", async () => {
    const out = await runRemindDry("2025-03-01");
    expect(out).toContain("sale in **2 days**");
  });

  test("7 days before (offset 7) shows 1 week message", async () => {
    const out = await runRemindDry("2025-02-24");
    expect(out).toContain("sale is in **1 week**");
  });

  test("no reminder needed when offset not in [7,2,1,0]", async () => {
    const out = await runRemindDry("2025-03-15");
    expect(out).toContain("No reminder needed today");
  });

  test("year wrap: after 12.12 references next year 1.1", async () => {
    const out = await runRemindDry("2025-12-25");
    expect(out).toContain("2026-01-01");
    expect(out).toContain("1.1");
  });
});
