# Four Fits

A coaching diagnostic for early-stage propositions, built on Brian Balfour's Four Fits framework.

Live: https://dpowert2.github.io/four-fits/

## What it does

Walks a founder through four hypothesis cards (Market, Product, Channel, Model), then runs an AI critique that flags where the joints aren't yet aligned and suggests the next move for each gap. Coaching tone, not a verdict.

Built on:
- Brian Balfour's [Four Fits framework](https://brianbalfour.com/four-fits-growth-framework)
- Sean Ellis's [Hacking Growth](https://userpilot.com/blog/hacking-product-growth-sean-ellis/) (Aha moment, onboarding-as-product, Time to Value)
- Strategyzer's Business Model Generation (model patterns)
- Steve Blank's definition of a startup ("a temporary entity set up to find a scalable repeatable business model")
- Christoph Janz's mice/rabbits/deer/elephants/whales

## Architecture

- `index.html` — single-page app, served from GitHub Pages.
- `worker.js` — Cloudflare Worker that proxies to the Anthropic API. Holds the API key as a Worker secret.
- The frontend reads the Worker URL from `<meta name="four-fits-api">` in `index.html`.

The Worker is gated to specific origins (`dpowert2.github.io` plus localhost) and caps prompt length to limit abuse. For higher-traffic deployments, add Cloudflare's Rate Limiting Rules on the Worker route.

## Deploying the Worker

```bash
# 1. Install wrangler if needed
npm install -g wrangler

# 2. Authenticate
wrangler login

# 3. Set the Anthropic API key as a Worker secret
wrangler secret put ANTHROPIC_API_KEY
# (paste your sk-ant-... key)

# 4. Deploy
wrangler deploy
```

Wrangler prints a URL like `https://four-fits-api.<subdomain>.workers.dev`. Paste that URL into the `content` attribute of the `<meta name="four-fits-api">` tag at the top of `index.html`, commit, and push.

## Running locally

```bash
# Serve the static site
python3 -m http.server 8000
# → http://localhost:8000
```

Without the Worker URL set, the app falls back to a "copy prompt" modal — paste the prompt into Claude or ChatGPT manually.

## Updating the prompt

The system prompt lives inline in `index.html` as `SYSTEM_FRAME`. It encodes the diagnostic frame, the coaching tone, and the JSON output schema. Changes don't require redeploying the Worker.
