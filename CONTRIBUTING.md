# Contributing

## Dev setup

```bash
bun install
bun run dev              # 起 dev server on 127.0.0.1:5175
bun run test             # node --test 单元测试
bun run e2e              # Playwright E2E (自动起 dev server)
bun run build            # 生产打包
bun run format           # Prettier
```

## PR 约定

- 分支：`fix/` `feat/` `chore/` `test/` `docs/` 前缀 + 描述
- Commit：中文正文 · 简洁概括改动 · body 说明根因/方案/验证
- 单 PR 单主题；≥400 行 diff 请拆分
- 修 UI 需真机 / 至少 2 分辨率手动验证
- 加/改 CSS 时同步 e2e 断言（`e2e/`）
- 数据源 (`public/data/*.json`) 保留繁体原样，展示层 i18n

## Data source

线路 / 站点 / 路径数据来自 TDX (交通部 API)，禁止直接改 `metro.json` 繁体名。
需要简体或英文时通过 `src/lib/i18n.js` localizeText 处理。

## Code style

- Prettier default（`bun run format`）
- 中文注释、中文提交信息
- React 19 · hooks · 无 class 组件
