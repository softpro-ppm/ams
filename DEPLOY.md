# Auto-Deploy Setup

Push to `main` (or `master`) triggers automatic deployment to production.

## One-Time: Add GitHub Secrets

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** for each:

| Secret | Value |
|--------|-------|
| `HOSTINGER_HOST` | `us-imm-web1739.hstgr.io` |
| `HOSTINGER_USERNAME` | `u820431346` |
| `HOSTINGER_SSH_KEY` | Your SSH private key (paste full contents) |

**Get your SSH key:** `cat ~/.ssh/id_rsa` (or id_ed25519)

## Workflow

1. **Work locally** – make changes
2. **Run build** – `npm run build`
3. **Commit** – GitHub Desktop
4. **Push** – GitHub Actions deploys automatically

## Production URL

https://ams.softpromis.com
