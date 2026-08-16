---
name: one-cloudflare-nextjs
description: Deploy Next.js App Router projects to Cloudflare with OpenNext, automated GitHub Actions CI/CD, and D1/R2 bindings.
disable-model-invocation: true
---

# Next.js Cloudflare (OpenNext + GitHub Actions) 自动化部署

## 1. 资源创建与配置

- **D1 数据库**：`<project-name>`（多库时加后缀：`<project-name>-<module>`）
- **R2 存储桶**：`<project-name>`（多桶时加后缀：`<project-name>-<purpose>`）

```bash
# 创建 D1 数据库
pnpm wrangler d1 create <project-name>

# 创建 R2 存储桶（可选）
pnpm wrangler r2 bucket create <project-name>
```

写入 `wrangler.toml`：

```toml
name = "<project-name>"
main = ".open-next/worker.js"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

assets = { directory = ".open-next/assets", binding = "ASSETS" }

[[d1_databases]]
binding = "DB"
database_name = "<project-name>"
database_id = "<d1-uuid>"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "<project-name>"
```

## 2. 数据库迁移

```bash
# 本地测试环境
pnpm wrangler d1 migrations apply <project-name> --local

# 生产环境
pnpm wrangler d1 migrations apply <project-name> --remote
```

## 3. GitHub Actions 自动部署流水线

### Step 1: 写入部署工作流 `.github/workflows/deploy.yml`

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build and Deploy with OpenNext
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          pnpm exec opennextjs-cloudflare build
          pnpm exec opennextjs-cloudflare deploy
```

### Step 2: 绑定 GitHub 仓库 Secrets

```bash
gh secret set CLOUDFLARE_API_TOKEN --body "$CLOUDFLARE_API_TOKEN" --repo <owner>/<repo>
gh secret set CLOUDFLARE_ACCOUNT_ID --body "$CLOUDFLARE_ACCOUNT_ID" --repo <owner>/<repo>
```

配置完成后，任何推送到 `main` 分支的提交均会自动触发构建与部署。
