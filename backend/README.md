# Backend — Visitor Counter (Cloudflare Worker + KV)

A tiny API with one job: increment a number in KV and return it. This is the
"Lambda + DynamoDB" equivalent from the AWS version of the Cloud Resume
Challenge, built on Cloudflare instead.

## Files

```
backend/
├── src/
│   └── index.js          ← the Worker (handles the request, CORS, KV read/write)
├── test/
│   └── index.spec.js     ← Vitest suite (runs against a real Workers runtime)
├── vitest.config.js       ← wires up @cloudflare/vitest-pool-workers
├── eslint.config.js       ← lint rules run in CI
├── wrangler.toml          ← Worker config: name, entrypoint, KV binding
├── package.json
└── README.md
```

> **Note:** `wrangler.toml` is Worker _configuration_, not Infrastructure-as-Code —
> it tells Wrangler which Worker to deploy and which KV namespace to bind, but it
> doesn't provision cloud resources the way a CloudFormation/Terraform template
> does. The KV namespace itself is created with the `wrangler kv namespace create`
> command in step 3 below.

## 1. Install Wrangler and log in

```bash
npm install -g wrangler
wrangler login
```

This opens a browser tab to authorize Wrangler against your Cloudflare
account. Once it confirms, Wrangler can deploy on your behalf.

## 2. Get your Account ID

Cloudflare dashboard → **Workers & Pages** → Account ID is shown in the
right-hand panel. Copy it.

## 3. Create the KV namespace (this is your "database")

From inside `backend/`:

```bash
wrangler kv namespace create "VISIT_COUNTER"
```

Wrangler prints something like:

```javascript
{
  ((binding = "VISIT_COUNTER"), (id = "abc123def456..."));
}
```

## 4. Fill in `wrangler.toml`

Open `wrangler.toml` and replace:

- `YOUR_CLOUDFLARE_ACCOUNT_ID` → the Account ID from step 2
- `PASTE_YOUR_KV_NAMESPACE_ID_HERE` → the `id` from step 3
  The Account ID is not a secret and is safe to commit — only the Cloudflare
  API token (used by CI to deploy) needs to stay in GitHub Secrets.

## 5. Install dependencies

```bash
npm install
```

## 6. Run the tests

```bash
npm test
```

This runs the Vitest suite via `@cloudflare/vitest-pool-workers`, which spins
up a real Workers runtime (not a mock) to test against. The suite covers:

- first visit starts the counter at 1
- the counter increments on each POST
- non-POST methods are rejected with 405
- the OPTIONS preflight returns the right CORS headers
- normal responses include the CORS header
- a KV failure returns a 500
  You'll see a `console.error` line in the test output during the "KV failure"
  test — that's expected. It's the Worker's own error logging firing as part of
  that test, not a failing test.

## 7. Lint

```bash
npm run lint
```

Runs ESLint against `src/`.

## 8. Test locally

```bash
wrangler dev
```

In another terminal:

```bash
curl -X POST http://localhost:8787/visits
# {"count":1}

curl -X POST http://localhost:8787/visits
# {"count":2}
```

If the number goes up each time, the Worker and KV are wired correctly.

## 9. Deploy

```bash
wrangler deploy
```

Wrangler prints your live Worker URL, e.g.:

```
https://cloud-resume-counter.YOUR_SUBDOMAIN.workers.dev
```

Verify it live:

```bash
curl -X POST https://cloud-resume-counter.YOUR_SUBDOMAIN.workers.dev/visits
```

## 10. Connect the frontend

Open `script.js` in the frontend and update:

```javascript
// Before:
const COUNTER_API_URL = "https://PLACEHOLDER.workers.dev/visits";

// After (use your real Worker URL from step 9):
const COUNTER_API_URL =
  "https://cloud-resume-counter.YOUR_SUBDOMAIN.workers.dev/visits";
```

Reload your site — the footer counter should animate up on every visit.

## 11. CORS

`src/index.js` locks `ALLOWED_ORIGIN` down to the live Pages URL:

```javascript
const ALLOWED_ORIGIN = "https://abd-cloud-resume-v1.pages.dev";
```

Only that origin can call the counter. If you fork this project or deploy
your own Pages site, update `ALLOWED_ORIGIN` to match your real Pages URL,
then redeploy:

```bash
wrangler deploy
```

Reload your live site and confirm the counter still increments, and that
DevTools → Console shows no CORS errors.

## CI/CD

Two separate GitHub Actions workflows handle this backend:

**`.github/workflows/ci.yml`** — runs on every pull request that touches
`backend/**`. Lints, tests, and does a `wrangler deploy --dry-run` to
validate the Worker config, without actually deploying. This is the gate
that should pass before a PR is merged.

**`.github/workflows/deploy-backend.yml`** — runs on every push to `main`
that touches `backend/**`. Deploys the Worker for real via
`cloudflare/wrangler-action`, using `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` from GitHub Secrets.

In short: PRs get checked, `main` gets deployed. Neither workflow triggers on
a plain branch push that isn't a PR — `ci.yml` only fires once a PR is
opened.

## Troubleshooting

| Symptom                             | Likely cause                                                                                                                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Counter shows "—" forever           | `COUNTER_API_URL` still says `PLACEHOLDER`, or the Worker isn't deployed                                                                                                                                  |
| CORS error in console               | `ALLOWED_ORIGIN` doesn't match your actual Pages URL exactly (no trailing slash)                                                                                                                          |
| `{"error":"Counter unavailable"}`   | KV namespace id in `wrangler.toml` is wrong or missing                                                                                                                                                    |
| Count resets to 1                   | You created a second KV namespace by mistake — check `wrangler kv namespace list` and make sure `wrangler.toml` points at the right one                                                                   |
| Tests fail with a Vitest pool error | Version mismatch in `@cloudflare/vitest-pool-workers` — make sure `vitest.config.js` uses the `cloudflareTest()` plugin + `defineConfig` from `vitest/config`, not the older `defineWorkersConfig` import |
| `ci.yml` never runs                 | It only triggers on `pull_request`, not on pushes to a feature branch — open a PR against `main` to see it run                                                                                            |
