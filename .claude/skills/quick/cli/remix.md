# quick remix

Start from an existing Quick site. Copy the deployed files, clone the source, or find where the source lives.

## Usage

```bash
quick remix [site-name]
```

If `site-name` is omitted, prompts for one.

## What it offers

Remix checks the site's metadata and presents options:

- **Copy deployed files** — downloads what's currently live into a local folder. Always available.
- **Clone source from Quick** — if the site's source is hosted on Quick git, clones the repo. You get the full history.
- **Source lives at [URL]** — if the source is on GitHub or elsewhere, shows the link so you can go there.

After copying or cloning, remix asks for a new site name so you don't deploy over the original.

## Example

```bash
quick remix cool-dashboard
# → Choose: Copy deployed files / Clone source from Quick
# → New site name: my-dashboard
# → Files ready in ./my-dashboard
```

## Prerequisites

- `gcloud` CLI installed and authenticated
- `git` installed (for cloning)
