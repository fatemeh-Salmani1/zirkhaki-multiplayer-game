# Zirkhaki Multiplayer Game

A treasure card game for 2–8 players. Create a room, share its code, and play from separate phones or laptops without signing in.

Gameplay inspired by **Dead Man’s Draw**. The interface and illustrations were created for this project.


## Stack

React, TypeScript, Vinext/Vite, Cloudflare Workers, and Cloudflare D1. The frontend uses `/api/game` on the same host. Atomic version checks protect rooms against simultaneous moves. Private tokens and peeks are filtered from opponents’ responses.

## Publish through Cloudflare

1. Upload this project’s **contents** to the root of `fatemeh-Salmani1/zirkhaki-multiplayer-game` on GitHub.
2. In Cloudflare, open **Compute → Workers & Pages → Create application** and choose the GitHub import option.
3. Authorize access to this repository and select it.
4. Set the Worker name to `zirkhaki-multiplayer-game`, the production branch to `main`, and the root directory to `/`.
5. Use build command `pnpm run build` and deploy command `pnpm run deploy`. Allow Cloudflare to install dependencies from `pnpm-lock.yaml`. Use Node.js 22.13 or later.
6. Allow provisioning of the D1 database bound as `DB`. No secret API keys or manual schema setup are needed by the application. The Worker initializes its empty room table on the first game API request.
7. When deployment succeeds, open the provided `workers.dev` URL and test a room from two devices.
8. Under the Worker’s **Settings → Domains & Routes**, add a Custom Domain: `zirkhaki.fatemehsalmani.com`. Cloudflare manages its DNS and certificate.

The game’s deployment is separate from the personal website’s GitHub Pages configuration. Existing game rooms on the ChatGPT-hosted version do not transfer to the new database.

## Local development

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Validation

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec wrangler deploy --dry-run
```

Tests cover the card rules, 100 complete simulated matches, two-player games through the real API in both modes, stale/concurrent moves, private information, and presence notifications.

## Hosting limits

Cloudflare Workers and D1 usage limits apply. Rooms poll for updates while players have the game open, so traffic grows with the number of active players. Check usage in the Cloudflare dashboard before sharing widely.
