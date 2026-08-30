import test from 'node:test';
import assert from 'node:assert/strict';

const { default: handler } = await import('./send-email.js');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test('handler accepts JSON body from Vercel request and sends via Resend', async () => {
  process.env.RESEND_API_KEY = 'test-key';
  process.env.REPORT_TO_EMAIL = 'to@example.com';
  process.env.REPORT_FROM_EMAIL = 'from@example.com';

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => ''
  });

  try {
    const request = {
      method: 'POST',
      headers: {},
      json: async () => ({
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'Hello from the test.'
      })
    };

    const response = createResponse();
    const result = await handler(request, response);

    assert.equal(response.statusCode, 200, 'expected success status');
    assert.deepEqual(response.body, { ok: true });
    assert.equal(result?.statusCode || response.statusCode, 200);
  } finally {
    global.fetch = originalFetch;
  }
});
