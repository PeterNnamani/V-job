const extensionApi = globalThis.browser || globalThis.chrome;

window.addEventListener("message", async (event) => {
  if (event.source !== window) return;

  const request = event.data;
  if (!request || request.source !== "v-job-website" ||
      request.type !== "V_JOB_EXTENSION_REQUEST" || request.version !== 1 ||
      typeof request.requestId !== "string" || typeof request.nonce !== "string") return;

  const supportedOperations = ["get_non_sensitive_cookie_metadata", "get_visited_sites"];
  if (!supportedOperations.includes(request.operation)) return;

  let response;
  try {
    response = await extensionApi.runtime.sendMessage({
      type: "V_JOB_AUTHORIZED_OPERATION",
      requestId: request.requestId,
      nonce: request.nonce,
      origin: event.origin,
      url: window.location.href,
      operation: request.operation
    });
  } catch {
    response = { ok: false };
  }

  window.postMessage({
    source: "v-job-extension",
    type: "V_JOB_EXTENSION_RESPONSE",
    requestId: request.requestId,
    nonce: request.nonce,
    ok: response?.ok === true,
    result: response?.ok ? response.result : undefined
  }, event.origin);
});
