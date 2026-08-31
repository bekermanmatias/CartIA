import fs from "node:fs/promises";
import path from "node:path";

const endpoint = process.argv[2] || "http://127.0.0.1:9230";
const outputDir = process.argv[3] || process.cwd();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findTarget() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
      const target = targets.find((item) => item.type === "page");
      if (target) return target;
    } catch {
      // Browser may still be starting.
    }
    await wait(200);
  }
  throw new Error("No se encontró una página disponible.");
}

const target = await findTarget();
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
    const item = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message));
    else item.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") errors.push(message.params.entry.text);
});

function send(method, params = {}) {
  sequence += 1;
  return new Promise((resolve, reject) => {
    pending.set(sequence, { resolve, reject });
    socket.send(JSON.stringify({ id: sequence, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(selector) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
    await wait(100);
  }
  throw new Error(`No apareció ${selector}`);
}

async function screenshot(name) {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
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
await send("Page.navigate", { url: "http://localhost:4173/#carta" });
await waitFor(".catalog-manager");
await evaluate(`localStorage.removeItem("cartia-menu-dishes"); localStorage.removeItem("cartia-service-options"); localStorage.removeItem("cartia-visual-theme"); location.reload()`);
await waitFor(".catalog-manager");
await wait(700);
await screenshot("implementation-catalog-admin-desktop.png");

await evaluate(`document.querySelector(".catalog-dish .catalog-edit")?.click()`);
await waitFor(".dish-editor");
const editorVisible = await evaluate(`Boolean(document.querySelector(".dish-editor input"))`);
await evaluate(`(() => {
  const input = document.querySelector('.dish-form input[placeholder="$18.900"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(input, "$19.500");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  document.querySelector(".dish-editor footer .primary-button")?.click();
})()`);
await wait(250);
const editedPrice = await evaluate(`document.querySelector(".catalog-dish .catalog-price")?.textContent`);

await evaluate(`window.location.hash = "estilo"`);
await waitFor(".style-screen, .style-layout");
await evaluate(`document.querySelectorAll(".palette-list button")[1]?.click(); document.querySelectorAll(".toggle-stack input")[1]?.click()`);
await wait(250);
const settingsSaved = await evaluate(`({
  theme: JSON.parse(localStorage.getItem("cartia-visual-theme") || "{}").name,
  bill: JSON.parse(localStorage.getItem("cartia-service-options") || "{}").bill
})`);

await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: 390,
  screenHeight: 844,
});
await evaluate(`window.location.hash = "menu"`);
await waitFor(".guest-page");
await wait(3100);
const mobileMetrics = await evaluate(`({
  width: innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  primary: getComputedStyle(document.querySelector(".guest-page")).getPropertyValue("--guest-primary").trim(),
  serviceButtons: document.querySelectorAll(".guest-service-dock button").length,
  videoVisible: document.querySelector(".guest-feature video")?.getBoundingClientRect().height > 0
})`);
await screenshot("implementation-guest-menu-expanded-mobile.png");

await evaluate(`document.querySelector(".guest-header > button")?.click()`);
await waitFor(".guest-search-field");
await evaluate(`(() => {
  const input = document.querySelector(".guest-search-field input");
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(input, "ravioles");
  input.dispatchEvent(new Event("input", { bubbles: true }));
})()`);
await wait(200);
const searchResults = await evaluate(`document.querySelectorAll(".guest-dish-list article").length`);
await screenshot("implementation-guest-search-mobile.png");

await evaluate(`document.querySelector(".guest-search-field button")?.click(); document.querySelector(".guest-dish-list button")?.click()`);
await wait(3000);
await evaluate(`document.querySelector(".guest-service-dock button:last-child")?.click()`);
await waitFor(".selection-sheet");
await wait(300);
const selectionReady = await evaluate(`({
  items: document.querySelectorAll(".selection-items article").length,
  total: document.querySelector(".selection-total strong")?.textContent
})`);
await screenshot("implementation-guest-selection-mobile.png");

await evaluate(`localStorage.removeItem("cartia-menu-dishes"); localStorage.removeItem("cartia-service-options"); localStorage.removeItem("cartia-visual-theme"); window.location.hash = "carta"; location.reload()`);
await waitFor(".catalog-manager");
await wait(600);
await screenshot("implementation-catalog-admin-mobile.png");
await evaluate(`document.querySelector(".catalog-dish .catalog-edit")?.click()`);
await waitFor(".dish-editor");
await wait(250);
const mobileEditorMetrics = await evaluate(`({
  width: Math.round(document.querySelector(".dish-editor").getBoundingClientRect().width),
  scrollWidth: document.documentElement.scrollWidth,
  saveVisible: document.querySelector(".dish-editor footer .primary-button")?.getBoundingClientRect().height > 0
})`);
await screenshot("implementation-dish-editor-mobile.png");
await evaluate(`document.querySelector(".dish-editor > header button")?.click()`);

await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1024,
  deviceScaleFactor: 1,
  mobile: false,
});
await evaluate(`window.location.hash = "carta"`);
await wait(250);

socket.close();
console.log(JSON.stringify({ editorVisible, editedPrice, settingsSaved, mobileMetrics, searchResults, selectionReady, mobileEditorMetrics, errors }, null, 2));
