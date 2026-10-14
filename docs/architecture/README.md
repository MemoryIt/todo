# 架构文档

本目录以 C4 模型（C4-PlantUML，规范详见 `reference/README.md`；Code 层使用原生 UML 类图）描述系统架构，设计文件存放在 `diagrams/` 目录下。图源（`.puml`）是权威来源，代码与实现应与图保持一致。用户或 Agent 可通过目录结构先了解大致架构；在仓库根目录执行 `bun run diagrams:render` 可生成 SVG 渲染图，执行 `bun run diagrams:check` 可检查设计文件的绘图语法。
