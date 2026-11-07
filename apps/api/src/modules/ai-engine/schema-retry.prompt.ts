/** Prompt dùng chung cho cơ chế retry schema của agent-runner. */
export function buildSchemaRetryPrompt(errors: string, jsonSchemaStr?: string): string {
  const schemaSection = jsonSchemaStr
    ? `\n\n<schema>\n${jsonSchemaStr}\n</schema>`
    : "";
  return `Your previous response did not match the required schema.\n\n<validation_errors>\n${errors}\n</validation_errors>${schemaSection}\n\nReturn corrected JSON only.`;
}
