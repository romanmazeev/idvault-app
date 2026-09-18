# IDVault website

Static marketing site for [idvault.app](https://idvault.app), designed to deploy through GitHub Pages.

## Local preview

Build the shared header, footer, home-page cards, site settings, and styles into the deployable `dist` directory:

```sh
node scripts/build-site.mjs
```

Serve the `dist` directory with any static HTTP server. For example:

```sh
python3 -m http.server 4173 --directory dist
```

## Deployment

The source of truth for shared site chrome is in `site/shared/`. Home-page card data and markup live in `site/home/`; shared links are configured in `site/config.mjs`. The GitHub Actions workflow in `.github/workflows/pages.yml` builds these components and publishes `dist` whenever `main` or `master` is updated. In the repository's GitHub Pages settings, select **GitHub Actions** as the source.

Set `idvault.app` as the custom domain under **Settings → Pages**, configure the domain's DNS for GitHub Pages, then enable **Enforce HTTPS**. GitHub ignores `CNAME` files for custom Actions workflows; `dist/CNAME` remains as a portable declaration of the intended domain if the publishing source changes later.
