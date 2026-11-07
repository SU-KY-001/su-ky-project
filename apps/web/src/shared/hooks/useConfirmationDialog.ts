import { useCallback, useEffect, useRef, useState } from "react";
import type { ConfirmationDialogProps, ConfirmationRequest } from "@/shared/components/common/ConfirmationDialog";

export function useConfirmationDialog(): {
  requestConfirmation: (request: ConfirmationRequest) => Promise<boolean>;
  confirmation: ConfirmationDialogProps;
} {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);
  const requestConfirmation = useCallback((next: ConfirmationRequest): Promise<boolean> => {
    if (resolver.current) return Promise.resolve(false);
    return new Promise((resolve) => {
      resolver.current = resolve;
      setRequest(next);
    });
  }, []);
  const onResolve = useCallback((confirmed: boolean): void => {
    const resolve = resolver.current;
    resolver.current = null;
    setRequest(null);
    resolve?.(confirmed);
  }, []);
  useEffect(() => () => {
    resolver.current?.(false);
    resolver.current = null;
  }, []);
  return { requestConfirmation, confirmation: { request, onResolve } };
}
