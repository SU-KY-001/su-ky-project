import { CreateScriptWorkflowRequestSchema } from "@repo/shared";

const topicSchema = CreateScriptWorkflowRequestSchema.shape.topic;

/** Limits come from the shared schema so the form can never drift from the API. */
export const TOPIC_MIN_LENGTH = topicSchema.minLength ?? 0;
export const TOPIC_MAX_LENGTH = topicSchema.maxLength ?? Number.MAX_SAFE_INTEGER;

export const AI_UNAVAILABLE_MESSAGE = "Hệ thống AI chưa sẵn sàng, chưa thể tạo kịch bản.";
/** Fallback wait when a 429 carries no Retry-After header. */
export const DEFAULT_RETRY_AFTER_SECONDS = 30;
export const COUNTDOWN_TICK_MS = 1000;
export const SERVICE_UNAVAILABLE_STATUS = 503;
export const BAD_REQUEST_STATUS = 400;
export const TOO_MANY_REQUESTS_STATUS = 429;
