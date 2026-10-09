import { ModelRuntime } from "@earendil-works/pi-coding-agent";
import { env } from "../../../../core/env";
import { logger } from "../../../../core/logger";
import { DEFAULT_PI_MODEL_BY_PROVIDER, PI_MODEL_REFRESH_TIMEOUT_MS } from "../../script-workflow.constants";

export interface PiModel {
  id: string;
}

export class PiRuntime {
  private static instance: PiRuntime | null = null;
  public modelRuntime: ModelRuntime | null = null;
  public model: PiModel | null = null;
  public isReady: boolean = false;

  private constructor() {}

  public static getInstance(): PiRuntime {
    if (!PiRuntime.instance) {
      PiRuntime.instance = new PiRuntime();
    }
    return PiRuntime.instance;
  }

  public async init(): Promise<void> {
    try {
      this.modelRuntime = await ModelRuntime.create({
        refreshOnCreate: false,
        allowModelNetwork: false,
        modelRefreshTimeoutMs: PI_MODEL_REFRESH_TIMEOUT_MS,
      });
      const resolvedApiKey =
        env.PI_API_KEY ||
        (env.PI_PROVIDER === "google"
          ? env.GEMINI_API_KEY
          : env.OPENCODE_API_KEY);

      if (resolvedApiKey) {
        this.modelRuntime.setRuntimeApiKey(env.PI_PROVIDER, resolvedApiKey);
        if (env.PI_PROVIDER === "google") {
          process.env.GEMINI_API_KEY = resolvedApiKey;
        }
      }
      const targetModelName = env.PI_MODEL ?? DEFAULT_PI_MODEL_BY_PROVIDER[env.PI_PROVIDER] ?? "";
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
      this.isReady = !!(this.model && resolvedApiKey);
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
