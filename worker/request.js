export async function readJsonLimited(request, maxBytes) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { error: "Content-Type must be application/json." };
  }

  const declaredLength = Number(request.headers.get("Content-Length") || "0");
  if (declaredLength > maxBytes) return { error: "Request body is too large." };

  if (!request.body) return { error: "Invalid JSON body." };
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { error: "Request body is too large." };
      }
      chunks.push(value);
    }
  } catch {
    return { error: "Invalid JSON body." };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    return body && typeof body === "object" && !Array.isArray(body)
      ? { body }
      : { error: "Invalid request body." };
  } catch {
    return { error: "Invalid JSON body." };
  }
}
