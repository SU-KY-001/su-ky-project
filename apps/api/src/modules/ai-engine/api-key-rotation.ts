const HTTP_RATE_LIMITED = 429;

/** Each instance remembers its own key; callers own deadlines and provider errors. */
export function createApiKeyRotation() {
  let activeApiKey: string | undefined;

  return async function withApiKeyRotation(
    apiKeys: readonly string[],
    request: (apiKey: string) => Promise<Response>,
  ): Promise<Response> {
    if (!apiKeys.length) throw new RangeError("API key rotation requires at least one key");
    const startIndex = Math.max(apiKeys.indexOf(activeApiKey ?? ""), 0);
    for (let attempt = 0; attempt < apiKeys.length; attempt += 1) {
      const keyIndex = (startIndex + attempt) % apiKeys.length;
      const response = await request(apiKeys[keyIndex]!);
      if (response.status !== HTTP_RATE_LIMITED) return response;
      activeApiKey = apiKeys[(keyIndex + 1) % apiKeys.length];
      if (attempt === apiKeys.length - 1) return response;
      await response.text();
    }
    throw new Error("API key rotation ended without a response");
  };
}
