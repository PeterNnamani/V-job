const extensionApi = globalThis.browser || globalThis.chrome;

extensionApi.runtime.onMessage.addListener(async (message, sender) => {
  if (!message || message.type !== "V_JOB_AUTHORIZED_OPERATION" ||
      message.operation !== "get_non_sensitive_cookie_metadata" ||
      typeof message.requestId !== "string" || typeof message.nonce !== "string" ||
      !sender.tab || !message.url) {
    return { ok: false };
  }

  try {
    const cookies = await extensionApi.cookies.getAll({ url: message.url });
    return {
      ok: true,
      result: {
        cookieCount: cookies.length,
        cookies: cookies.map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          hostOnly: cookie.hostOnly,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          session: cookie.session,
          expirationDate: cookie.expirationDate ?? null
        }))
      }
    };
  } catch {
    return { ok: false };
  }
});
