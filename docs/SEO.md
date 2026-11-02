# Search and sharing maintenance

The canonical demo URL is https://keremdemirer.github.io/3dbinpackingjs/.
`index.html` ships its title, description, Open Graph and Twitter card metadata,
and JSON-LD directly in HTML. The project overview, API example, and questions
are also static HTML; only the calculator needs JavaScript.

The schema describes the page, web application, and source repository. It does
not claim a verified license, npm publication, reviews, ratings, or guaranteed
search enhancements. Keep descriptions aligned with actual behavior.

`sitemap.xml` lists the single canonical page. Section anchors are not separate
pages. There are no invented modification dates or duplicate `/index.html`
entries. If the hosting URL changes, update canonical, social URLs, JSON-LD,
sitemap, package homepage, README, and GitHub's About website together.

There is intentionally no project-level robots.txt. Crawlers look for it at the
host root (`https://keremdemirer.github.io/robots.txt`), not this project's
`/3dbinpackingjs/` path. A file here would not control crawling. Host-level
rules, if introduced elsewhere, must continue to allow this project and assets.

## After merging

1. Wait for GitHub Pages to deploy. Check the page source, sitemap, favicon, and
   `demo/assets/social-preview.png` at the public project URL.
2. In Google Search Console, verify a URL-prefix property for the project URL
   using your own account and the verification method Google supplies. Then
   submit `sitemap.xml` and request inspection of the canonical page. No account
   verification token is included in this repository.
3. If desired, upload `demo/assets/social-preview.png` in the repository's
   Settings → General → Social preview. Demo Open Graph metadata and GitHub's
   repository social preview are separate settings.
4. Check indexing and search queries in Search Console after crawling. Indexing,
   rankings, snippets, and cached social cards are controlled by their providers;
   a sitemap or structured data does not guarantee a particular appearance.

The share artwork is maintained as `demo/assets/social-preview.svg`, alongside a
1200×630 PNG for social crawlers. Regenerate the PNG after changing the SVG and
inspect both. Neither is loaded as part of the demo UI, so the share image adds
no initial-page image download.

References: [Google SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide),
[robots.txt scope](https://developers.google.com/search/docs/crawling-indexing/robots/intro),
and [Open Graph metadata](https://ogp.me/).
