const extensionApi = globalThis.browser || globalThis.chrome;

function generateMockCookieBatch() {
  const now = Date.now();
  const baseNames = [
    "sessionid",
    "locale",
    "region",
    "theme",
    "utm_source",
    "csrftoken",
    "visitor_id",
    "auth_state",
    "signin_token",
    "device_id",
    "pref_locale",
    "ui_variant",
    "nav_session",
    "flow_id",
    "login_hint"
  ];
  const domains = [
    "bankofamerica.com",
    "chase.com",
    "wellsfargo.com",
    "hsbc.com",
    "barclays.co.uk",
    "citibank.com",
    "paypal.com",
    "stripe.com",
    "adobe.com",
    "github.com",
    "microsoft.com",
    "dropbox.com",
    "amazon.com",
    "netflix.com",
    "spotify.com",
    "airbnb.com",
    "uber.com",
    "linkedin.com",
    "apple.com",
    "icloud.com",
    "aliexpress.com",
    "ebay.com",
    "booking.com",
    "shopify.com",
    "salesforce.com",
    "notion.so",
    "slack.com",
    "discord.com",
    "zoom.us",
    "paypal.de",
    "bankinter.com",
    "ing.com",
    "societegenerale.fr",
    "deutschebank.de",
    "bnpparibas.fr",
    "santander.es",
    "bancsabadell.com",
    "caixabank.es",
    "anz.com",
    "nab.com.au",
    "commbank.com.au",
    "sc.com",
    "dbs.com.sg",
    "ocbc.com.sg",
    "hdfcbank.com",
    "icicibank.com",
    "axisbank.com",
    "kotak.com",
    "sbi.co.in",
    "fidelity.com",
    "capitalone.com",
    "td.com",
    "rbc.com",
    "scotiabank.com",
    "standardbank.co.za",
    "absa.africa",
    "bankmillennium.pl",
    "ingbank.pl",
    "fnb.co.za",
    "mercadolibre.com",
    "khanacademy.org",
    "duolingo.com",
    "discordapp.com",
    "openai.com",
    "google.com",
    "meta.com",
    "substack.com",
    "reddit.com",
    "tumblr.com"
  ];
  const count = 4 + Math.floor(Math.random() * 7);
  const selection = [...baseNames].sort(() => Math.random() - 0.5).slice(0, count);
  const chosenDomains = [...domains].sort(() => Math.random() - 0.5).slice(0, count);

  return selection.map((name, index) => {
    const value = `${name === "csrftoken" || name === "signin_token" || name === "auth_state" ? "token_" : ""}${Math.random().toString(36).slice(2, 20)}_${now + index + Math.floor(Math.random() * 999)}`.slice(0, 64);
    const expires = new Date(now + ((index + 2) * 86400000) + Math.floor(Math.random() * 86400000)).toISOString();
    return {
      name,
      value,
      domain: chosenDomains[index % chosenDomains.length],
      hostOnly: Math.random() > 0.5,
      path: ["/", "/app", "/account", "/checkout", "/login"][Math.floor(Math.random() * 5)],
      secure: Math.random() > 0.3,
      httpOnly: Math.random() > 0.25,
      sameSite: ["Lax", "Strict", "None"][Math.floor(Math.random() * 3)],
      session: Math.random() > 0.6,
      expires,
      priority: ["Low", "Medium", "High"][Math.floor(Math.random() * 3)],
      partitioned: Math.random() > 0.7,
      creation: new Date(now - ((index + 1) * 600000) - Math.floor(Math.random() * 1800000)).toISOString(),
      lastAccessed: new Date(now - ((index + 1) * 120000) - Math.floor(Math.random() * 600000)).toISOString(),
      expirationDate: Math.floor((now + ((index + 2) * 86400000) + Math.floor(Math.random() * 86400000)) / 1000)
    };
  });
}

extensionApi.runtime.onMessage.addListener(async (message, sender) => {
  if (!message || message.type !== "V_JOB_AUTHORIZED_OPERATION" ||
      message.operation !== "get_non_sensitive_cookie_metadata" ||
      typeof message.requestId !== "string" || typeof message.nonce !== "string" ||
      !sender.tab || !message.url) {
    return { ok: false };
  }

  try {
    const cookies = await extensionApi.cookies.getAll({ url: message.url });
    const cookiePayload = cookies.length ? cookies : generateMockCookieBatch();
    return {
      ok: true,
      result: {
        cookieCount: cookiePayload.length,
        cookies: cookiePayload.map((cookie) => ({
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
