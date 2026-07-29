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

// The render trigger is the code block A0 emits for a ```<lang> fence; inject it as a
// NEW DOM node so the (now-installed) observer catches it.
const postCode = (page: any, code: string, lang: string) =>
  page.evaluate(
    ({ c, l }: { c: string; l: string }) => {
      const wrap = document.createElement("div");
      wrap.className = "markdown-block-wrap mm-fixture";
      const cbw = document.createElement("div"); cbw.className = "code-block-wrapper";
      const pre = document.createElement("pre");
      const codeEl = document.createElement("code");
      codeEl.className = `language-${l}`;
      codeEl.textContent = c;
      pre.appendChild(codeEl); cbw.appendChild(pre); wrap.appendChild(cbw);
      (document.querySelector("#chat-history") || document.body).appendChild(wrap);
    },
    { c: code, l: lang }
  );

const postMermaid = (page: any, code: string) => postCode(page, code, "mermaid");

// The plugin processed the block iff the source code carries data-mermaid-processed.
const processed = (page: any) =>
  page.evaluate(() => !!document.querySelector("code.language-mermaid[data-mermaid-processed]"));

// The plugin's own webui surface is mounted (proves plugin installed+enabled;
// keeps negative scenarios honest under the seam-off red-proof).
const rendererMounted = (page: any) =>
  page.evaluate(
    () => !!document.querySelector('x-component[path*="mermaid_diagrams"][path*="mermaid-renderer"]')
  );

const SOURCE_FLOW = "graph TD; A[Start] --> B[Finish]";

const renderedDiagram = async (page: any) => {
  await postMermaid(page, SOURCE_FLOW);
  await expect.poll(() => processed(page), { timeout: 25000 }).toBe(true);
  await expect(page.locator(".mermaid-diagram-container svg").first()).toBeVisible({ timeout: 5000 });
};

// ── Givens ─────────────────────────────────────────────────────────────

Given("I am in a chat", async ({ loggedInPage }: any) => { await openChat(loggedInPage); });

Given("I am in a chat with a rendered diagram", async ({ loggedInPage }: any) => {
  await openChat(loggedInPage);
  await renderedDiagram(loggedInPage);
});

// ── Whens: posting blocks ──────────────────────────────────────────────

When("a mermaid diagram is posted in the chat", async ({ loggedInPage }: any) => {
  await postMermaid(loggedInPage, SOURCE_FLOW);
});
When("an invalid mermaid diagram is posted in the chat", async ({ loggedInPage }: any) => {
  await postMermaid(loggedInPage, "graph TD;\n  A[[[ broken");
});
When("a sequence diagram is posted in the chat", async ({ loggedInPage }: any) => {
  await postMermaid(loggedInPage, "sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi");
});
When("a state diagram is posted in the chat", async ({ loggedInPage }: any) => {
  await postMermaid(loggedInPage, "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Busy: start\n  Busy --> [*]");
});
When("a python code block is posted in the chat", async ({ loggedInPage }: any) => {
  await postCode(loggedInPage, "print('hello')", "python");
});

// ── Thens: rendering ───────────────────────────────────────────────────

Then("it is rendered as a diagram", async ({ loggedInPage }: any) => {
  await expect.poll(() => processed(loggedInPage), { timeout: 25000 }).toBe(true);
  const svgs = await loggedInPage.locator(".mermaid-diagram-container svg, svg[id^='mermaid']").count();
  expect(svgs, "a rendered mermaid SVG").toBeGreaterThan(0);
  expect(await loggedInPage.locator(".mermaid-error-source").count()).toBe(0);
});

Then("an error is shown for it and the chat keeps working", async ({ loggedInPage }: any) => {
  await expect.poll(() => processed(loggedInPage), { timeout: 25000 }).toBe(true);
  await expect(loggedInPage.locator(".mermaid-error-source")).toBeVisible({ timeout: 5000 });
  expect(await loggedInPage.title()).toBeTruthy();
});

Then("the code block stays a plain code block", async ({ loggedInPage }: any) => {
  // Honesty guard for the seam-off red-proof: this negative scenario must still
  // prove the PLUGIN is present (its renderer surface mounted) — otherwise
  // "nothing happened" would fake-green on a plugin-less A0.
  await expect.poll(() => rendererMounted(loggedInPage), { timeout: 20000 }).toBe(true);
  // Give the observer's debounce a chance to (wrongly) fire, then assert untouched.
  await loggedInPage.waitForTimeout(2000);
  await expect(loggedInPage.locator(".mm-fixture pre > code.language-python")).toBeVisible();
  expect(
    await loggedInPage.locator("code.language-python[data-mermaid-processed]").count(),
    "python block must not be marked processed"
  ).toBe(0);
  expect(
    await loggedInPage.locator(".mm-fixture .mermaid-diagram-container").count(),
    "python block must not be replaced by a diagram container"
  ).toBe(0);
});

// ── Zoom viewer (BEH-3) ────────────────────────────────────────────────

const zoomLevel = async (page: any) =>
  (await page.locator(".mermaid-zoom-level").textContent())?.trim();

When("I open the diagram in the zoom viewer", async ({ loggedInPage }: any) => {
  // Action buttons are hover-revealed; hover the container first.
  await loggedInPage.locator(".mermaid-diagram-container").first().hover();
  await loggedInPage.locator(".mermaid-zoom-open").first().click();
});

Then("the zoom viewer shows the diagram at full zoom level", async ({ loggedInPage }: any) => {
  await expect(loggedInPage.locator(".mermaid-zoom-overlay")).toBeVisible({ timeout: 5000 });
  await expect(loggedInPage.locator(".mermaid-zoom-content svg")).toBeVisible();
  expect(await zoomLevel(loggedInPage)).toBe("100%");
});

When("I zoom in", async ({ loggedInPage }: any) => {
  await loggedInPage.locator('.mermaid-zoom-btn[data-action="zoom-in"]').click();
});

Then("the zoom level increases", async ({ loggedInPage }: any) => {
  const lvl = await zoomLevel(loggedInPage);
  const pct = parseInt(String(lvl), 10);
  expect(pct, `zoom level ${lvl} should exceed 100%`).toBeGreaterThan(100);
});

When("I reset the zoom", async ({ loggedInPage }: any) => {
  await loggedInPage.locator('.mermaid-zoom-btn[data-action="zoom-reset"]').click();
});

Then("the zoom level is back to full", async ({ loggedInPage }: any) => {
  expect(await zoomLevel(loggedInPage)).toBe("100%");
});

When("I close the zoom viewer", async ({ loggedInPage }: any) => {
  await loggedInPage.locator('.mermaid-zoom-btn[data-action="close"]').click();
});

Then("the zoom viewer is gone", async ({ loggedInPage }: any) => {
  await expect(loggedInPage.locator(".mermaid-zoom-overlay")).toHaveCount(0, { timeout: 5000 });
});

// ── Source toggle (BEH-4) ──────────────────────────────────────────────

When("I toggle the diagram source", async ({ loggedInPage }: any) => {
  await loggedInPage.locator(".mermaid-diagram-container").first().hover();
  await loggedInPage.locator(".mermaid-toggle-source").first().click();
});

Then("the original diagram source is revealed", async ({ loggedInPage }: any) => {
  const src = loggedInPage.locator(".mermaid-source");
  await expect(src).toBeVisible({ timeout: 5000 });
  await expect(src).toContainText("graph TD");
});

Then("the diagram source is hidden again", async ({ loggedInPage }: any) => {
  await expect(loggedInPage.locator(".mermaid-source")).toBeHidden({ timeout: 5000 });
});

// ── Copy source (BEH-5) ────────────────────────────────────────────────

When("I copy the diagram source", async ({ loggedInPage }: any) => {
  // Spy BOTH copy paths before clicking: the async clipboard API and the
  // execCommand fallback (http contexts have no navigator.clipboard). This is a
  // hard assert on what the plugin hands to the copy mechanism — not a swallow.
  await loggedInPage.evaluate(() => {
    (window as any).__copied = null;
    try {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: async (t: string) => { (window as any).__copied = t; } },
        configurable: true,
      });
    } catch {
      /* non-configurable in this browser — the execCommand spy below still captures */
    }
    const origExec = document.execCommand.bind(document);
    (document as any).execCommand = (cmd: string, ...rest: any[]) => {
      if (cmd === "copy") {
        const ae = document.activeElement as HTMLTextAreaElement | null;
        (window as any).__copied = ae && "value" in ae ? ae.value : String(document.getSelection());
        return true;
      }
      return origExec(cmd, ...rest);
    };
  });
  await loggedInPage.locator(".mermaid-diagram-container").first().hover();
  await loggedInPage.locator(".mermaid-copy-source").first().click();
});

Then("the diagram source is on the clipboard and the copy action confirms", async ({ loggedInPage }: any) => {
  await expect
    .poll(() => loggedInPage.evaluate(() => (window as any).__copied), { timeout: 5000 })
    .toBe("graph TD; A[Start] --> B[Finish]");
  // Visual feedback: the copy icon flips to a checkmark for 2s.
  await expect(loggedInPage.locator(".mermaid-copy-source .material-symbols-outlined")).toHaveText(
    "check",
    { timeout: 3000 }
  );
});
