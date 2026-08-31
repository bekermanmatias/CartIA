import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const target = resolve(root, "dist", "hostinger", "public_html");

await rm(resolve(root, "dist", "hostinger"), { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(resolve(root, "dist", "client"), target, { recursive: true });
await cp(resolve(root, "api"), resolve(target, "api"), { recursive: true });
await cp(resolve(root, "database"), resolve(target, "database"), { recursive: true });
await cp(resolve(root, "uploads"), resolve(target, "uploads"), { recursive: true });
await cp(resolve(root, ".htaccess"), resolve(target, ".htaccess"));

console.log("Prepared Hostinger package: dist/hostinger/public_html");

