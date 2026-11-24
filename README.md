# 🎀 Maltese Secret Santa

A pink, fluffy, ad-free Secret Santa for a small group of friends. The organiser takes part in the draw too, and can't see anyone else's match.

Forked from [arcanis/secretsanta](https://github.com/arcanis/secretsanta) (MIT, see below) and reworked with a Maltese theme and a claim-once reveal.

## How it works

1. **Organiser** opens the site, adds everyone's names (and optional gift ideas and "must / must not give to" rules), and presses **Draw**.
2. The draw runs in the organiser's browser. Each giver's result is encrypted with its own random key:
   - the **encrypted envelopes** are stored with the draw, so the group link is short (`…/#/d/<draw id>`);
   - the **keys** are stored per name and only ever released through the claim endpoint.

   The pairings are never shown, saved in the clear or exported. (Older long links that carry the envelopes in the `#` fragment still work.)
3. Everyone opens the **same link**, taps their own name, and unwraps their match.
4. The server releases each key **once**, to the first device that claims that name, and remembers that device. After that, the name shows as "opened" for everyone else.
5. After unwrapping, each person can write **their own wishlist**. Only their Secret Santa can read it: a read token for each person's wishlist is sealed inside their Santa's envelope, and the server stores only its hash, so it never learns who the Santa is. Draws made before this feature fall back to "anyone with the group link can read wishlists".

### What this protects against (and what it doesn't)

- ✅ Nobody can see the full draw on screen, the organiser included.
- ✅ If someone opens a name that isn't theirs, the real person finds it already "opened" and knows something's up. The organiser can **reset** that name from the status panel so the right person can open it.
- ⚠️ Peeking is *detectable*, not *impossible*. Whoever controls the Cloudflare account could, with deliberate effort, combine the stored keys with the envelopes in the database. For a group of friends, being caught is the deterrent.

## Running locally

```sh
corepack enable
yarn install
yarn db:migrate:local   # creates the local D1 database
yarn preview            # builds the site and serves site + API on http://localhost:8787
```

`yarn test` runs the unit tests and `yarn typecheck` checks the types of both the site and the Worker.

For UI work with hot reload, run `yarn wrangler dev` in one terminal and `yarn dev` in another (Vite proxies `/api` to the Worker).

## Deploying (Cloudflare, free tier)

```sh
yarn wrangler login
yarn wrangler d1 create maltese-santa      # copy the printed database_id into wrangler.jsonc
yarn db:migrate:remote
yarn deploy                                # prints your https://maltese-santa.<you>.workers.dev URL
```

## Project layout

- `src/`: React site (organiser page `#/`, reveal page `#/reveal`)
- `src/utils/links.ts`: draw + envelope sealing, claim tokens
- `worker/index.ts`: claim-once API (`POST /api/draws`, `GET /api/draws/:id`, `GET /api/draws/:id/bundle`, `POST /api/draws/:id/claim`, `POST /api/draws/:id/reset`, `PUT|POST /api/draws/:id/wishes`)
- `migrations/`: D1 schema
- `static/maltese.svg`: the Maltese 🐶

## License (MIT)

> **Copyright © 2015 Maël Nison**
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
