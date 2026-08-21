<div align="center">

# ☁️ Cloud Resume Challenge

### A serverless, full-stack resume site built on Cloudflare's edge platform

**[🌐 Live Site](https://abd-cloud-resume-v1.pages.dev)** · **[📄 Backend Docs](./backend/README.md)** · **[🐛 Report an Issue](https://github.com/nicocodes9/abd-cloud-resume-v1/issues)**

![Cloudflare Pages](https://img.shields.io/badge/Frontend-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Backend-Cloudflare%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Workers KV](https://img.shields.io/badge/Storage-Workers%20KV-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

</div>

---

## 📖 About This Project

This is my take on the [**Cloud Resume Challenge**](https://cloudresumechallenge.dev/) — the well-known hands-on project designed to prove cloud engineering skills through a real, deployed, production-grade application rather than a certificate alone.

Instead of building it on AWS (the "default" path most candidates take), I deliberately built it on **Cloudflare's free-tier stack** — Pages, Workers, and KV — while consciously mapping every primitive back to its AWS equivalent. The goal was to demonstrate the _underlying cloud engineering concepts_ (static hosting at the edge, serverless compute, NoSQL persistence, infrastructure-as-code, and CI/CD pipelines) rather than tie the project to one vendor's console.

| Cloudflare Primitive           | AWS Equivalent             | Role in this project                                      |
| ------------------------------ | -------------------------- | --------------------------------------------------------- |
| **Pages**                      | S3 + CloudFront            | Hosts and serves the static resume site from the edge     |
| **Workers**                    | Lambda + API Gateway       | Serverless function powering the visitor-counter REST API |
| **Workers KV**                 | DynamoDB                   | Key-value store that persists the visit count             |
| **Wrangler (`wrangler.toml`)** | CloudFormation / Terraform | Infrastructure-as-code for the Worker + KV binding        |
| **GitHub Actions**             | CodePipeline / CodeBuild   | CI/CD pipeline that auto-deploys on push                  |

---

## Screenshot

![Screenshot](./images/screenshot.png)

## Features

- 🖥️ **Static resume site** — a fast, responsive portfolio page with a downloadable PDF resume
- 🔢 **Live visitor counter** — a serverless API increments and returns a persistent visit count on every page load, animated into view on the frontend
- ⚙️ **Serverless backend** — a Cloudflare Worker with proper CORS handling, input validation, and graceful failure (the UI shows `—` instead of breaking if the API is ever down)
- 🔁 **Automated CI/CD** — GitHub Actions redeploys the Worker automatically whenever `backend/**` changes on `main`, using scoped secrets for authentication
- 🔒 **Locked-down CORS** — the API only accepts requests from the deployed Pages origin, not `*`
- 🧹 **Clean repo hygiene** — properly scoped `.gitignore` files at both the root and `backend/` level, with no secrets or local caches ever committed

---

## Architecture

<p align="center">
  <img src="./images/architecture.png" alt="Architecture Diagram" width="700">
</p>

**Request flow:** the browser loads the static site from Pages → `script.js` fires a `POST` to the Worker's `/visits` endpoint → the Worker reads the current count from KV, increments it, writes it back, and returns `{ "count": N }` → the frontend animates the new number into the footer.

---

## 📁 Repository Structure

<p align="center">
  <img src="./images/structure.png" alt="Repo Structure" width="700">
</p>

---

## 🛠️ Tech Stack

**Frontend**

- Vanilla HTML5 / CSS3 / JavaScript (no framework — kept intentionally lightweight)
- Deployed to **Cloudflare Pages**, served from the edge with no separate CDN needed

**Backend**

- **Cloudflare Workers** — serverless JavaScript runtime at the edge
- **Workers KV** — eventually-consistent key-value store for the visit counter

**DevOps / Tooling**

- **Wrangler CLI** — Cloudflare's infrastructure-as-code and deployment tool
- **GitHub Actions** — CI/CD, triggered on pushes to `main` that touch `backend/**`
- **GitHub Secrets** — stores `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` for the deploy job

---

## 🔌 API Reference

The backend exposes a single endpoint from the Worker.

### `POST /visits`

Increments the visit counter by 1 and returns the new total.

**Request**

```bash
curl -X POST https://cloud-resume-counter.nicoband9.workers.dev/visits
```

**Response — `200 OK`**

```json
{ "count": 42 }
```

**Response — `500 Internal Server Error`** (KV unavailable)

```json
{ "error": "Counter unavailable" }
```

**Response — `405 Method Not Allowed`** (any method other than `POST`/`OPTIONS`)

```json
{ "error": "Method not allowed" }
```

`OPTIONS` requests are handled automatically for CORS preflight and return `204 No Content`.

CORS is locked down to a single allowed origin — the deployed Pages URL — so the API cannot be called from arbitrary third-party sites.

---

## Getting Started Locally

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up)
- The [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/): `npm install -g wrangler`

### 1. Clone the repo

```bash
git clone https://github.com/nicocodes9/abd-cloud-resume-v1.git
cd abd-cloud-resume-v1
```

### 2. Set up the backend

Full step-by-step instructions — creating the KV namespace, wiring up `wrangler.toml`, running the Worker locally, deploying, and locking down CORS — live in **[`backend/README.md`](./backend/README.md)**. In short:

```bash
cd backend
npm install
wrangler login
wrangler kv namespace create "VISIT_COUNTER"   # then paste the returned id into wrangler.toml
wrangler dev                                    # local dev server
wrangler deploy                                 # ship it
```

### 3. Point the frontend at your Worker

In `frontend/script.js`, update:

```javascript
const COUNTER_API_URL =
  "https://your-worker-name.your-subdomain.workers.dev/visits";
```

### 4. Serve the frontend

Any static file server works for local preview:

```bash
cd frontend
npx serve .
```

For production, connect the repo to **Cloudflare Pages** with the build output directory set to `frontend`.

---

## ⚙️ CI/CD Pipeline

`.github/workflows/deploy-backend.yml` runs on every push to `main` that touches `backend/**`:

1. Checks out the repository
2. Sets up Node.js 20
3. Runs `wrangler deploy` via `cloudflare/wrangler-action`, authenticating with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` pulled from **GitHub Secrets**

The frontend is deployed separately and automatically by **Cloudflare Pages'** own Git integration whenever `frontend/**` changes — no custom workflow needed for that side.

> **Note:** the workflow's path filter is scoped to `backend/**`, so a change to the workflow file itself (or to the frontend) won't trigger a redeploy of the Worker.

---

## 🔐 Security Notes

- The Cloudflare **Account ID** in `wrangler.toml` is not a secret — Cloudflare explicitly designs it to be safe for public repos. Only the **API Token** is sensitive, and it lives exclusively in GitHub Secrets, never in the codebase.
- `.gitignore` is scoped at **both** the repo root and inside `backend/`, since a nested `.gitignore` alone won't catch root-level artifacts like `.wrangler/cache/`.
- CORS on the Worker is restricted to the live Pages origin, not `*`, so the counter API can't be invoked cross-origin from unrelated sites.
- No `.env` / `.dev.vars` files are ever committed — both are explicitly ignored.

---

## 🗺️ Roadmap

- [ ] Add automated tests for the Worker (e.g. `vitest` + Miniflare)
- [ ] Add a CI check that runs on pull requests, not just deploys on push
- [ ] Custom domain for the Pages site
- [ ] Optional: infrastructure-as-code for the Pages project itself (currently configured via dashboard)

---

## 🎓 What This Project Demonstrates

Built as part of a cloud-engineering job search, this project is meant to show — not just tell — familiarity with:

- Static site hosting at the edge (CDN-equivalent architecture)
- Serverless compute and event-driven APIs
- NoSQL key-value persistence
- Infrastructure-as-code
- CI/CD pipeline design with scoped triggers and secret management
- Secure-by-default practices (CORS scoping, secret hygiene, `.gitignore` discipline)

---

## 👤 Author

**Muhammad Abdullah**
GitHub: [@nicocodes9](https://github.com/nicocodes9)

---

## 📄 License

This project is open for reference and learning purposes. Feel free to fork it and adapt it for your own Cloud Resume Challenge attempt.

<div align="center">

_Built with ☁️ on Cloudflare's free tier._

</div>
