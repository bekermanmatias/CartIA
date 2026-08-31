import fs from "node:fs/promises";
import path from "node:path";

const endpoint = process.argv[2] || "http://127.0.0.1:9230";
const outputDir = process.argv[3] || process.cwd();
const uploadFile = process.argv[4];

async function waitForTarget() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
      const target = targets.find((item) => item.type === "page");
      if (target) return target;
    } catch {
      // Chrome may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("No se encontró la página de Chrome.");
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
    const item = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message));
    else item.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
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
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(selector) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
    await wait(120);
  }
  throw new Error(`No apareció ${selector}`);
}

async function screenshot(name) {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(outputDir, name), Buffer.from(result.data, "base64"));
}

await send("Runtime.enable");
await send("Page.enable");
await send("DOM.enable");
await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1024,
  deviceScaleFactor: 1,
  mobile: false,
});

await send("Page.navigate", { url: "http://localhost:4173/#contenido" });
await waitFor(".video-admin-screen");
await evaluate("Promise.all(Array.from(document.images).map((image) => image.decode?.().catch(() => null)))");
await wait(600);

const defaultVideoReady = await evaluate(`(() => {
  const video = document.querySelector(".video-preview-media video");
  return Boolean(video && video.getAttribute("src")?.includes("milanesa-demo.mp4"));
})()`);
await screenshot("implementation-video-admin-desktop.png");

await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: 390,
  screenHeight: 844,
});
await evaluate(`window.location.hash = "carta"`);
await waitFor(".carta-screen");
await wait(3000);
await screenshot("source-carta-mobile-baseline.png");

await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1024,
  deviceScaleFactor: 1,
  mobile: false,
});
await evaluate(`window.location.hash = "contenido"`);
await waitFor(".video-admin-screen");
await wait(400);

if (uploadFile) {
  const documentResult = await send("DOM.getDocument", { depth: -1, pierce: true });
  const inputResult = await send("DOM.querySelector", {
    nodeId: documentResult.root.nodeId,
    selector: '.video-admin-screen input[type="file"]',
  });
  await send("DOM.setFileInputFiles", { files: [uploadFile], nodeId: inputResult.nodeId });
  await wait(1800);
}

const uploadReady = await evaluate(`({
  fileName: document.querySelector(".video-file-row strong")?.textContent,
  progress: document.querySelector(".upload-progress span")?.style.width,
  publishEnabled: !document.querySelector(".video-preview-cta")?.disabled
})`);

await evaluate(`document.querySelector(".video-preview-cta")?.click()`);
await waitFor(".guest-page");
await wait(3000);

await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: 390,
  screenHeight: 844,
});
await wait(500);

const guestMetrics = await evaluate(`(() => {
  const video = document.querySelector(".guest-feature video");
  const dock = document.querySelector(".guest-service-dock");
  return {
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    videoVisible: Boolean(video && video.getBoundingClientRect().height > 0),
    playsInline: video?.hasAttribute("playsinline"),
    muted: video?.muted,
    dockVisible: Boolean(dock && getComputedStyle(dock).position === "fixed")
  };
})()`);
await screenshot("implementation-guest-menu-mobile.png");

await evaluate(`document.querySelector(".guest-price-row button")?.click()`);
await wait(120);
const selectionChanged = await evaluate(`document.querySelector(".guest-service-dock button:last-child span")?.textContent === "1"`);
await evaluate(`document.querySelector(".guest-service-dock button:first-child")?.click()`);
await wait(120);
const waiterFeedback = await evaluate(`Boolean(document.querySelector(".toast"))`);

await evaluate(`window.location.hash = "contenido"`);
await waitFor(".video-admin-screen");
await wait(3000);
const mobileAdminMetrics = await evaluate(`({
  innerWidth: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  workspaceWidth: Math.round(document.querySelector(".video-workspace")?.getBoundingClientRect().width || 0),
  panelVisible: Boolean(document.querySelector(".video-publish-panel"))
})`);
await screenshot("implementation-video-admin-mobile.png");

socket.close();

console.log(JSON.stringify({
  defaultVideoReady,
  uploadReady,
  guestMetrics,
  selectionChanged,
  waiterFeedback,
  mobileAdminMetrics,
  errors,
}, null, 2));
