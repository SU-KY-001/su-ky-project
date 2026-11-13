import { ModelRuntime } from "@earendil-works/pi-coding-agent";
import { env } from "../../core/env";
import { logger } from "../../core/logger";
import {
  COMMAND_CODE_CONTEXT_WINDOW,
  COMMAND_CODE_MAX_TOKENS,
  COMMAND_CODE_PROVIDER,
  DEFAULT_PI_MODEL_BY_PROVIDER,
  PI_MODEL_REFRESH_TIMEOUT_MS,
} from "./ai-engine.constants";

export interface PiModel {
  id: string;
}

export class PiRuntime {
  private static instance: PiRuntime | null = null;
  public modelRuntime: ModelRuntime | null = null;
  public model: PiModel | null = null;
  public isReady: boolean = false;

  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): PiRuntime {
    if (!PiRuntime.instance) {
      PiRuntime.instance = new PiRuntime();
    }
    return PiRuntime.instance;
  }

  /** Lazy, single-flight init: nothing touches the model runtime until the first agent run. */
  public ensureInit(): Promise<void> {
    this.initPromise ??= this.init();
    return this.initPromise;
  }

  private async init(): Promise<void> {
    try {
      this.modelRuntime = await ModelRuntime.create({
        refreshOnCreate: false,
        allowModelNetwork: false,
        modelRefreshTimeoutMs: PI_MODEL_REFRESH_TIMEOUT_MS,
      });
      // A stored login (e.g. OpenAI OAuth from `/login`) wins; an env key must not overwrite it.
      const hasStoredCredential = (await this.modelRuntime.listCredentials()).some((c) => c.providerId === env.PI_PROVIDER && c.type === "oauth");
      const targetModelName = env.PI_MODEL ?? DEFAULT_PI_MODEL_BY_PROVIDER[env.PI_PROVIDER] ?? "";
      const commandCodeKey = env.PI_API_KEY || env.COMMAND_CODE_API_KEY;
      if (env.PI_PROVIDER === COMMAND_CODE_PROVIDER) {
        if (!commandCodeKey) {
          logger.error({ provider: COMMAND_CODE_PROVIDER }, "No API key for provider; set COMMAND_CODE_API_KEY");
        } else {
          this.modelRuntime.registerProvider(COMMAND_CODE_PROVIDER, {
            name: "CommandCode",
            baseUrl: env.PI_COMMAND_CODE_BASE_URL,
            api: "openai-completions",
            apiKey: commandCodeKey,
            models: [
              {
                id: targetModelName,
                name: targetModelName,
                api: "openai-completions",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: COMMAND_CODE_CONTEXT_WINDOW,
                maxTokens: COMMAND_CODE_MAX_TOKENS,
              },
            ],
          });
          // The id above comes from PI_MODEL, so a typo only shows up as a provider 404 later; log what was registered.
          logger.info({ provider: COMMAND_CODE_PROVIDER, model: targetModelName, baseUrl: env.PI_COMMAND_CODE_BASE_URL }, "Registered provider");
        }
      }
      const resolvedApiKey = hasStoredCredential
        ? undefined
        : env.PI_API_KEY || (env.PI_PROVIDER === "google" ? env.GEMINI_API_KEY?.split(",").map((key) => key.trim()).find(Boolean) : env.PI_PROVIDER === "openai" || env.PI_PROVIDER === COMMAND_CODE_PROVIDER ? undefined : env.OPENCODE_API_KEY);

      if (resolvedApiKey) {
        this.modelRuntime.setRuntimeApiKey(env.PI_PROVIDER, resolvedApiKey);
        if (env.PI_PROVIDER === "google") {
          process.env.GEMINI_API_KEY = resolvedApiKey;
        }
      }
      const resolvedModel = this.modelRuntime.getModel(env.PI_PROVIDER, targetModelName);
      if (resolvedModel) {
        this.model = { id: resolvedModel.id };
      } else {
        const available = this.modelRuntime.getModels(env.PI_PROVIDER);
        if (available && available.length > 0 && available[0]) {
          this.model = { id: available[0].id };
          logger.warn({ targetModelName, fallback: this.model.id }, "Model not found, falling back");
        } else {
          logger.warn({ provider: env.PI_PROVIDER }, "No models found for provider");
        }
      }
      // getProviderAuthStatus also sees a key baked into a registered provider (commandcode); hasConfiguredAuth reads a snapshot that refreshes asynchronously.
      this.isReady = !!(this.model && (hasStoredCredential || resolvedApiKey || this.modelRuntime.getProviderAuthStatus(env.PI_PROVIDER).configured));
      logger.info(
        { provider: env.PI_PROVIDER, model: this.model?.id ?? "none", ready: this.isReady },
        "PiRuntime initialized"
      );
    } catch (err) {
      logger.error({ err }, "Failed to initialize PiRuntime");
      this.isReady = false;
    }
  }
}

export const piRuntime = PiRuntime.getInstance();
