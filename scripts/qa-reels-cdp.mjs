import fs from "node:fs/promises";
import path from "node:path";

const endpoint = process.argv[2] || "http://127.0.0.1:9230";
const outputDir = process.argv[3] || process.cwd();
const uploadFile = process.argv[4];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findTarget() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
      const target = targets.find((item) => item.type === "page");
      if (target) return target;
    } catch {
      // Browser may still be opening.
    }
    await wait(200);
  }
  throw new Error("No se encontró una página de navegador.");
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
await send("DOM.enable");
await send("Log.enable");
await send("Page.bringToFront");
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: 390,
  screenHeight: 844,
});
await send("Page.navigate", { url: "http://localhost:4173/#menu" });
await waitFor(".reel-feed");
await wait(1200);

const firstReel = await evaluate(`(() => {
  const feed = document.querySelector(".reel-feed");
  const videos = Array.from(document.querySelectorAll(".dish-reel video"));
  return {
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    reelHeight: Math.round(feed.getBoundingClientRect().height),
    videoCount: videos.length,
    firstPlaying: !videos[0].paused,
    firstLoop: videos[0].loop,
    firstInline: videos[0].hasAttribute("playsinline"),
    allLoop: videos.every((video) => video.loop),
    indicator: document.querySelector(".guest-view-switch > span")?.textContent
  };
})()`);
await screenshot("implementation-guest-reels-first-mobile.png");

await evaluate(`(() => {
  const feed = document.querySelector(".reel-feed");
  feed.scrollTo({ top: feed.clientHeight, behavior: "instant" });
  feed.dispatchEvent(new Event("scroll", { bubbles: true }));
})()`);
await wait(800);
const secondReel = await evaluate(`(() => {
  const videos = Array.from(document.querySelectorAll(".dish-reel video"));
  return {
    firstPaused: videos[0].paused,
    secondPlaying: !videos[1].paused,
    indicator: document.querySelector(".guest-view-switch > span")?.textContent,
    title: document.querySelectorAll(".dish-reel h1")[1]?.textContent
  };
})()`);
await screenshot("implementation-guest-reels-second-mobile.png");

await evaluate(`document.querySelectorAll(".guest-view-switch button")[1]?.click()`);
await waitFor(".guest-list-view");
await wait(300);
const listView = await evaluate(`({
  cards: document.querySelectorAll(".guest-dish-list-card").length,
  videoBadges: document.querySelectorAll(".guest-list-media span").length,
  listActive: document.querySelectorAll(".guest-view-switch button")[1]?.classList.contains("active")
})`);
await screenshot("implementation-guest-video-list-mobile.png");

await evaluate(`document.querySelectorAll(".guest-dish-list-card")[1]?.click()`);
await waitFor(".reel-feed");
await wait(700);
const listToReel = await evaluate(`({
  indicator: document.querySelector(".guest-view-switch > span")?.textContent,
  activeTitle: document.querySelectorAll(".dish-reel h1")[1]?.textContent,
  secondPlaying: !document.querySelectorAll(".dish-reel video")[1]?.paused
})`);
await screenshot("implementation-list-to-reel-mobile.png");

await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1024,
  deviceScaleFactor: 1,
  mobile: false,
});
await evaluate(`window.location.hash = "contenido"`);
await waitFor(".video-library");
await wait(700);
const adminLibrary = await evaluate(`({
  pieces: document.querySelectorAll(".video-library-grid article").length,
  loopLabels: Array.from(document.querySelectorAll(".video-library-grid small")).filter((node) => node.textContent.includes("loop activo")).length
})`);
await screenshot("implementation-video-library-all-dishes.png");

let multiVideoUpload = null;
if (uploadFile) {
  await evaluate(`(() => {
    const select = document.querySelector(".video-field select");
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    setter.call(select, "Burrata de la casa");
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await wait(120);
  const documentResult = await send("DOM.getDocument", { depth: -1, pierce: true });
  const inputResult = await send("DOM.querySelector", {
    nodeId: documentResult.root.nodeId,
    selector: '.video-admin-screen input[type="file"]',
  });
  await send("DOM.setFileInputFiles", { files: [uploadFile], nodeId: inputResult.nodeId });
  await wait(1500);
  const uploadState = await evaluate(`({
    fileName: document.querySelector(".video-file-row strong")?.textContent,
    dish: document.querySelector(".video-field select")?.value,
    ready: !document.querySelector(".video-publish-panel .primary-button")?.disabled
  })`);
  await evaluate(`document.querySelector(".video-publish-panel .primary-button")?.click()`);
  await wait(250);
  await evaluate(`window.location.hash = "menu"`);
  await waitFor(".reel-feed");
  await wait(400);
  const replacedSource = await evaluate(`document.querySelectorAll(".dish-reel video")[4]?.src.startsWith("blob:")`);
  multiVideoUpload = { ...uploadState, replacedSource };
}

await evaluate(`window.location.hash = "menu"`);
await wait(200);

socket.close();
console.log(JSON.stringify({ firstReel, secondReel, listView, listToReel, adminLibrary, multiVideoUpload, errors }, null, 2));
