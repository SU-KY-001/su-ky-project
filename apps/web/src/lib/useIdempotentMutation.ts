import { useRef } from "react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { canReuseIdempotencyKey } from "./apiError";
import { newIdempotencyKey } from "./idempotency";

type PendingKey = { fingerprint: string; key: string };

/**
 * Mutation whose Idempotency-Key survives only retryable failures (network, 429, 5xx)
 * for an identical payload. A 4xx response is replayed by the server for the same key,
 * so after it, or after the payload changes, a fresh key is generated.
 */
export function useIdempotentMutation<TInput, TOutput>(
  send: (input: TInput, idempotencyKey: string) => Promise<TOutput>,
  onSuccess?: (output: TOutput, input: TInput) => void | Promise<void>,
): UseMutationResult<TOutput, Error, TInput> {
  const pending = useRef<PendingKey | null>(null);

  return useMutation<TOutput, Error, TInput>({
    mutationFn: async (input) => {
      const fingerprint = JSON.stringify(input);
      const key = pending.current?.fingerprint === fingerprint ? pending.current.key : newIdempotencyKey();
      pending.current = { fingerprint, key };
      try {
        const output = await send(input, key);
        pending.current = null;
        return output;
      } catch (error) {
        if (!canReuseIdempotencyKey(error)) pending.current = null;
        throw error;
      }
    },
    onSuccess,
  });
}
