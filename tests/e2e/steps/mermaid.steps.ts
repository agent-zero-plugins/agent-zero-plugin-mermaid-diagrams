import { Given, When, Then } from "../../_testkit/e2e/bdd/bdd-fixtures";
import { expect } from "@playwright/test";

const openChat = async (page: any) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const { callJsonApi } = await import("/js/api.js");
    const r = await callJsonApi("/chat_create", {});
    const id = (r && (r.ctxid || r.context)) || "";
    if (id) (globalThis as any).setContext(id);
  });
  // let the sidebar-end extension's CDN import + MutationObserver install
  await page.waitForTimeout(9000);
};

// The render trigger is the code block A0 emits for a ```mermaid fence; inject it as a
// NEW DOM node so the (now-installed) observer catches it.
const postMermaid = (page: any, code: string) =>
  page.evaluate((c: string) => {
    const wrap = document.createElement("div");
    wrap.className = "markdown-block-wrap mm-fixture";
    const cbw = document.createElement("div"); cbw.className = "code-block-wrapper";
    const pre = document.createElement("pre");
    const codeEl = document.createElement("code");
    codeEl.className = "language-mermaid";
    codeEl.textContent = c;
    pre.appendChild(codeEl); cbw.appendChild(pre); wrap.appendChild(cbw);
    (document.querySelector("#chat-history") || document.body).appendChild(wrap);
  }, code);

// The plugin processed the block iff the source code carries data-mermaid-processed.
const processed = (page: any) =>
  page.evaluate(() => !!document.querySelector("code.language-mermaid[data-mermaid-processed]"));

Given("I am in a chat", async ({ loggedInPage }: any) => { await openChat(loggedInPage); });

When("a mermaid diagram is posted in the chat", async ({ loggedInPage }: any) => {
  await postMermaid(loggedInPage, "graph TD; A[Start] --> B[Finish]");
});
When("an invalid mermaid diagram is posted in the chat", async ({ loggedInPage }: any) => {
  await postMermaid(loggedInPage, "graph TD;\n  A[[[ broken");
});

Then("it is rendered as a diagram", async ({ loggedInPage }: any) => {
  await expect.poll(() => processed(loggedInPage), { timeout: 25000 }).toBe(true);
  const svgs = await loggedInPage.locator(".mm-fixture svg, svg[id^='mermaid']").count();
  expect(svgs, "a rendered mermaid SVG").toBeGreaterThan(0);
  expect(await loggedInPage.locator(".mermaid-error-source").count()).toBe(0);
});

Then("an error is shown for it and the chat keeps working", async ({ loggedInPage }: any) => {
  await expect.poll(() => processed(loggedInPage), { timeout: 25000 }).toBe(true);
  await expect(loggedInPage.locator(".mermaid-error-source")).toBeVisible({ timeout: 5000 });
  expect(await loggedInPage.title()).toBeTruthy();
});
