# Sabito — original platform connection flow

This workspace adapts the existing BizConnectAcademy/sabito project to the
existing PostgreSQL environment. The tenant, credential, token and Socket.IO
protocol are preserved. The local knowledge engine and chunking algorithm
come from that repository, with French fallback text and Unicode tokenization.
No external model is used by this engine.

The new `sabito_core` schema is separate from the previous preview knowledge.
No existing evaluation corrections were deleted or silently made shared.
The original repository's MySQL database is not accessed or migrated.

External MySQL/MariaDB deployments are now supported with a `mysql://`
`DATABASE_URL`. The PostgreSQL Preview remains unchanged. MySQL uses additive
`sabito_*` tables and its own full-text search; no existing database is replaced
or converted. See `../../deployment/CYBRANCEE.md` for the standalone Plesk package,
environment variables and production verification.

## Sabito server setup

Use workspace Secrets, never the chat, for:

- `ADMIN_API_KEY`: random administrator key, at least 24 characters.
- `JWT_SECRET`: random JWT signing secret, at least 32 characters.
- `CLIENT_SECRET_PEPPER`: separate random credential-hashing secret,
  at least 32 characters.

Generate three **different** random values, for example with a password
manager. Do not reuse platform client secrets for these server secrets.
Until these are configured, administrative actions and platform token
issuance fail explicitly. There is no anonymous development bypass.

Configure `PUBLIC_URL` with the actual public Sabito origin when publishing
and `CORS_ORIGINS` with the allowed BCA/other frontend origins (comma separated).
The development Preview origin is allowed in development only.
Do not copy the development Preview URL as a permanent production endpoint.

## Dashboard and platform onboarding

1. Open `/` or `/admin` in Build Preview.
2. Sign in with `ADMIN_API_KEY`. It stays in memory, not browser storage.
3. Create a project for the platform. Sabito returns its `clientId` and
   `clientSecret` once. Close the dialog only after saving them securely.
4. Set the Sabito server address, client ID and client secret on the
   **platform backend**. Example variable names are `SABITO_URL`,
   `SABITO_CLIENT_ID` and `SABITO_CLIENT_SECRET`; the receiving backend must
   actually read those variables.
5. The platform backend requests a user-specific chat token:

```http
POST /v1/auth/token
Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
Content-Type: application/json

{"external_user_id":"stable-platform-user-id"}
```

The backend derives `external_user_id` from its own authenticated session;
never trust an arbitrary user ID supplied by the browser. Omit it for a guest.
Only return `data.access_token` to the frontend, never the client secret.

```js
const socket = io(SABITO_URL, {
  path: "/socket.io",
  auth: { token: accessToken }
});
socket.emit("message:send", {
  idempotencyKey: crypto.randomUUID(),
  content: "Comment accéder à mes formations ?"
}, acknowledge);
```

Original events are preserved: `session:ready`, `conversation:start`,
`message:started`, `message:delta`, `message:complete`, `message:error`.
An acknowledgement means the message was accepted, not that the answer
has completed. Reuse the same idempotency key to retry the same operation.

REST paths work both at `/v1` (original integration) and `/api/v1`
(workspace-generated clients). `/socket.io` is routed to the API service.

## Approved knowledge and testing

Manage each project's documents through the dashboard. Corrections from its
test chat become documents used by that same engine. Documents can be edited
or removed. Empty knowledge returns an explicit unknown answer.

The administrator's test chat gets a project-scoped temporary token from
`POST /v1/admin/projects/:projectId/test-token`. It uses the same Socket.IO
engine as external platforms, not the former OpenAI evaluation route.
Conversation history is persistent and accessible only by the signed project
and external user identity.

Rotating credentials revokes both old client credentials and issued tokens
and disconnects existing project sockets. This is stricter than the original
repository's connect-time-only JWT verification.

## What this connection does not do

Credentials identify and authenticate the platform. They do **not** grant
Sabito automatic database/API access to BCA account data. Authorized live tools
must be implemented in the receiving platform and Sabito separately.
No such tools are represented as connected in this dashboard.

The previous evaluation page remains at `/legacy-test` to preserve its
browser-scoped corrections. It is not the default page and its paid inference
remains disabled. The production restriction on that old evaluation API
remains in place.

## Verification

`pnpm --filter @workspace/api-server run test:core` uses random process-local
credentials, the database's isolated test projects and an in-process HTTP/
Socket.IO test server. It cleans up its test projects. No workspace secrets
are written and no external AI is called.
