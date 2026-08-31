import fs from "node:fs/promises";
import path from "node:path";

const endpoint = process.argv[2] || "http://127.0.0.1:9229";
const outputDir = process.argv[3] || process.cwd();

async function waitForTarget() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
      const target = targets.find((item) => item.type === "page");
      if (target) return target;
    } catch {
      // Chrome may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("No se encontró una página de Chrome por CDP.");
}

const target = await waitForTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const errors = [];
let sequence = 0;

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") {
    errors.push(message.params.exceptionDetails.text);
  }
  if (message.method === "Log.entryAdded" && ["error", "warning"].includes(message.params.entry.level)) {
    errors.push(message.params.entry.text);
  }
});

function send(method, params = {}) {
  sequence += 1;
  return new Promise((resolve, reject) => {
    pending.set(sequence, { resolve, reject });
    socket.send(JSON.stringify({ id: sequence, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function wait(ms = 500) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function navigate(hash) {
  await send("Page.navigate", { url: `http://localhost:4173/${hash}` });
  const selector = hash.includes("carta") ? ".public-menu" : ".dish-row";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const ready = await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
    if (ready) break;
    await wait(120);
  }
  await evaluate("Promise.all(Array.from(document.images).map((image) => image.decode?.().catch(() => null)))");
  await wait(250);
}

async function screenshot(name) {
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await fs.writeFile(path.join(outputDir, name), Buffer.from(result.data, "base64"));
}

await send("Runtime.enable");
await send("Page.enable");
await send("Log.enable");

await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1024,
  deviceScaleFactor: 1,
  mobile: false,
});
await navigate("");
const dashboardImages = await evaluate(`({
  count: document.querySelectorAll("img").length,
  firstRow: document.querySelector(".dish-row")?.innerHTML || null,
  images: Array.from(document.querySelectorAll("img")).map((image) => ({
    src: image.getAttribute("src"),
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    renderedWidth: Math.round(image.getBoundingClientRect().width)
  }))
})`);
await screenshot("implementation-dashboard-v2.png");

await evaluate(`document.querySelector(".pending-button")?.click()`);
await wait(150);
const requestDrawerOpened = await evaluate(`Boolean(document.querySelector('[role="dialog"]'))`);
await evaluate("document.querySelector('.drawer .icon-button')?.click()");
await wait(100);

await evaluate(`document.querySelector(".insight-panel .primary-button")?.click()`);
await wait(120);
const improveDrawerOpened = await evaluate(`Boolean(document.querySelector(".drawer textarea"))`);
await evaluate("document.querySelector('.drawer .icon-button')?.click()");
await wait(100);

const periodChanged = await evaluate(`(() => {
  const select = document.querySelector(".period-select select");
  if (!select) return false;
  select.selectedIndex = 2;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return select.selectedIndex === 2;
})()`);

await evaluate(`Array.from(document.querySelectorAll(".nav-item")).find((button) => button.textContent.includes("Carta"))?.click()`);
await wait(600);
const cartaHeading = await evaluate("document.querySelector('h1')?.textContent");
const categoryChanged = await evaluate(`(() => {
  const tab = Array.from(document.querySelectorAll(".category-tabs button")).find((button) => button.textContent === "Entradas");
  tab?.click();
  return Boolean(tab);
})()`);
await wait(100);
const editModeChanged = await evaluate(`(() => {
  const button = Array.from(document.querySelectorAll(".toolbar-actions button")).find((item) => item.textContent.includes("Editar carta"));
  button?.click();
  return Boolean(button);
})()`);
await wait(100);
const editModeRendered = await evaluate(`document.body.textContent.includes("Terminar edición")`);
await evaluate(`Array.from(document.querySelectorAll(".toolbar-actions button")).find((item) => item.textContent.includes("Terminar edición"))?.click()`);
await wait(100);
await screenshot("implementation-carta-v2.png");
await evaluate(`document.querySelector(".hero-copy button")?.click()`);
await wait(120);
const selectionChanged = await evaluate(`document.querySelector(".guest-actions")?.textContent.includes("1 en selección")`);
const guestActionsVisible = await evaluate(`(() => {
  const actions = Array.from(document.querySelectorAll(".guest-actions button")).map((button) => button.textContent.trim());
  return actions.includes("Llamar al mozo") && actions.includes("Pedir la cuenta");
})()`);

await evaluate(`Array.from(document.querySelectorAll(".nav-item")).find((button) => button.textContent.includes("Administración"))?.click()`);
await wait(250);
const adminScreenOpened = await evaluate(`document.querySelector("h1")?.textContent === "Restaurantes bajo control"`);
await evaluate(`document.querySelector(".secondary-screen .primary-button")?.click()`);
await wait(100);
const adminCreateFeedback = await evaluate(`Boolean(document.querySelector(".toast"))`);

await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: 390,
  screenHeight: 844,
});
await navigate("#carta");
const mobileMetrics = await evaluate(`({
  innerWidth: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  publicMenuWidth: Math.round(document.querySelector(".public-menu")?.getBoundingClientRect().width || 0),
  bottomNavVisible: getComputedStyle(document.querySelector(".bottom-nav")).display !== "none"
})`);
await screenshot("implementation-carta-mobile-v2.png");

socket.close();

console.log(JSON.stringify({
  requestDrawerOpened,
  improveDrawerOpened,
  dashboardImages,
  periodChanged,
  cartaHeading,
  categoryChanged,
  editModeChanged,
  editModeRendered,
  selectionChanged,
  guestActionsVisible,
  adminScreenOpened,
  adminCreateFeedback,
  mobileMetrics,
  errors,
}, null, 2));
