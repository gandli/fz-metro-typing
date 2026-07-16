# Security Policy

## Reporting

如发现安全漏洞，请通过 GitHub Security Advisory 私下上报：
https://github.com/gandli/tw-metro-typing-zh-cn/security/advisories/new

请勿在公开 issue 中披露漏洞细节。

## Scope

本项目为纯静态前端（Vite + React），无后端 / 无用户数据 / 无认证。攻击面主要为：
- 依赖供应链（npm registry）
- 构建产物（`dist/`）注入
- CDN 底图 tile / 数据源污染

## Not in scope

- 端到端加密 / 用户身份认证（本项目不涉及）
- 服务端漏洞（无服务端）
