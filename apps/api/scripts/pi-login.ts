// Logs a provider into the SAME credential store the API reads (pi's ModelRuntime).
// Run from apps/api:  bun scripts/pi-login.ts [providerId]   (default: openai)
// Prints the auth URL; the local callback server finishes the login once the browser returns.
import { ModelRuntime, SettingsManager } from "@earendil-works/pi-coding-agent";

const providerId = process.argv[2] ?? "openai";
const runtime = await ModelRuntime.create({ refreshOnCreate: false, allowModelNetwork: false });

const credential = await runtime.login(providerId, "oauth", {
  notify(event) {
    if (event.type === "auth_url") console.log(`AUTH_URL ${event.url}`);
    else if (event.type === "device_code") console.log(`DEVICE_CODE ${event.userCode} ${event.verificationUri}`);
    else console.log(event.message);
  },
  // Manual paste is only a fallback; the callback server aborts this prompt when it wins.
  prompt: (p) => {
    const { promise, reject } = Promise.withResolvers<string>();
    console.log(`PROMPT ${p.message}`);
    p.signal?.addEventListener("abort", () => reject(new Error("prompt aborted")), { once: true });
    return promise;
  },
}, { getDeviceId: () => SettingsManager.create(process.cwd()).getOrCreateDeviceId() });

console.log(`LOGIN_DONE ${providerId} ${credential.type}`);
process.exit(0);
