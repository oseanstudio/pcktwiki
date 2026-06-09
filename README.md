# pckt.wiki

Your personal wiki on the open social web — a sister app to [pckt.blog](https://pckt.blog).

Build a wiki from what you already have on AT Protocol (profile, pckt.blog posts) plus pages you write and style in this app. Wiki data is stored in your own PDS.

## Features

- AT Protocol OAuth sign-in (Bluesky, pckt.cafe, self-hosted)
- Wiki pages stored as `wiki.pckt.page` records in your PDS
- Auto-import profile and Standard.site blog posts from pckt.blog
- Embed blog posts and link cards in wiki pages
- Customizable theme (colors, fonts, layout)
- Progressive Web App with offline support
- Hosted on GitHub Pages at [pckt.wiki](https://pckt.wiki)

## Development

```bash
npm install
npm run dev
```

Use `http://127.0.0.1:5173` (not `localhost`) for AT Protocol OAuth loopback during development.

## Deploy

Push to `main` — GitHub Actions builds and deploys to GitHub Pages. Set the custom domain `pckt.wiki` in repo settings.

## Lexicons

- `wiki.pckt.space` — wiki configuration and theme
- `wiki.pckt.page` — wiki pages (markdown + embeds)

See [`lexicons/`](lexicons/) for definitions.

## License

MIT
