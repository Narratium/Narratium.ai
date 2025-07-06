<h1 style="border-bottom: none" align="center">
  <a href="https://narratium.org/">Narratium.ai</a>
  <br />
  <p>创建、游玩和与AI角色扮演</p>
</h1>

<div align="center">
  <blockquote>
    <em><strong>世界广阔无垠，让想象力引领前行，但人心永远不可直视</strong></em><br>
    <em><strong>The world is vast, let imagination lead, but human hearts remain forever inscrutable</strong></em>
  </blockquote>
</div>

<br>

![Narratium.ai](https://raw.githubusercontent.com/Narratium/Narratium.ai/main/public/banner.png)

<p align="center">
  <em>一个开源的AI角色平台，用于构建、定制和与虚拟角色聊天</em>
  <br>
  <em>为构建互动世界的作家、开发者和故事讲述者而设计</em>
</p>

<div align="center">
  <a href="https://narratium.org">🔗 Live Demo</a> &nbsp;|&nbsp;
  <a href="https://deepwiki.com/Narratium/Narratium.ai/">📖 DeepWiki Docs</a> &nbsp;|&nbsp;
  <a href="https://discord.gg/PP7EpSzDfU">💬 Discord Community</a> &nbsp;|&nbsp;
  <a href="https://github.com/Narratium/Narratium.ai/releases">💾 Download</a> &nbsp;|&nbsp;
  <a href="./README_ZH.md">🇨🇳 中文文档</a>
</div>

<br>

<div align="center">

[![Twitter Follow](https://img.shields.io/twitter/follow/qian_crypto?style=social)](https://x.com/qian_crypto)
![GitHub stars](https://img.shields.io/github/stars/Narratium/Narratium.ai?style=social)
![GitHub forks](https://img.shields.io/github/forks/Narratium/Narratium.ai?style=social)
![GitHub commits](https://img.shields.io/github/commit-activity/m/Narratium/Narratium.ai)
![GitHub Downloads](https://img.shields.io/github/downloads/Narratium/Narratium.ai/total)

</div>

<div align="center">
  <em><strong>角色、世界和对话 — 在Narratium中完美统一</strong></em>
</div>

<br>

<img src="https://raw.githubusercontent.com/Narratium/Narratium.ai/main/assets/demo_show.gif" style="width: 100%"/>

## 开始使用并关注我们

<div align="center">
  <strong>给我们星标，您将及时收到GitHub的所有发布通知！</strong>
</div>

<br>

<img src="https://raw.githubusercontent.com/Narratium/Narratium.ai/main/assets/welcome_star.gif" style="width: 100%" />

| 什么是Narratium |
| :---------------- |

[Narratium.ai](https://narratium.org/) 是一个用于创建AI角色、沉浸式世界和动态对话的开源平台。它是您构建个性化角色扮演冒险的创意工作室 — 从情感旅程到史诗传奇。

| 版本说明 |
| :---------------- |

项目采用双分支开发模式：

- **main**: 稳定版本分支，定期通过 pake 构建桌面端版本。
- **dev**: 开发版本分支，每天会有多次提交。

| 快速开始 |
| :---------- |

如需详细的安装和设置说明，请参阅我们的[快速开始指南](./docs/GETTING_STARTED.md)。

如需详细的 Vercel 部署说明，请参阅 [Vercel 部署指南](./docs/VERCEL_DEPLOYMENT.md)。

如需客户端下载版本，请访问 [Mac、Windows、Linux 下载页面](https://github.com/Narratium/Narratium.ai/releases)。

| 功能特性 |
| :------- |

- **沉浸式冒险模式**: 创建个性化世界并做出重要的决策。
- **可视化记忆管理**: 基于React Flow的会话追踪和分支。
- **角色卡片与背景**: 兼容SillyTavern卡片，在一处管理所有内容。

| API 推荐与配置 |
| :-------------- |

**推荐API服务**:
- **OpenAI**: 直接支持 OpenAI API 格式的模型。
- **OpenRouter**: 推荐使用 [OpenRouter](https://openrouter.ai/) 统一访问多种模型。
- **中转站部署**: 推荐 [new-api](https://github.com/QuantumNous/new-api)。
- **本地部署**: 支持 Ollama、LM Studio 等本地推理服务。

| Narratium与其他AI角色扮演平台对比 |
| :---------------------------------------- |

<table style="width: 100%;">
  <tr>
    <th align="center">功能</th>
    <th align="center">Narratium.ai</th>
    <th align="center">SillyTavern</th>
    <th align="center">AI Dungeon</th>
    <th align="center">fount</th>
  </tr>
  <tr>
    <td><strong>开源</strong></td>
    <td align="center">✅</td>
    <td align="center">✅</td>
    <td align="center">❌</td>
    <td align="center">❌</td>
  </tr>
  <tr>
    <td><strong>新手友好</strong></td>
    <td align="center">✅</td>
    <td align="center">❌ (复杂设置)</td>
    <td align="center">✅ (但流程有限)</td>
    <td align="center">❌</td>
  </tr>
  <tr>
    <td><strong>角色记忆与追踪</strong></td>
    <td align="center">✅</td>
    <td align="center">⚠️ (基于插件)</td>
    <td align="center">❌</td>
    <td align="center">❌</td>
  </tr>
  <tr>
    <td><strong>世界书支持</strong></td>
    <td align="center">✅</td>
    <td align="center">⚠️ (通过扩展)</td>
    <td align="center">❌</td>
    <td align="center">❌</td>
  </tr>
  <tr>
    <td><strong>长期对话支持</strong></td>
    <td align="center">✅</td>
    <td align="center">✅</td>
    <td align="center">❌ (上下文有限)</td>
    <td align="center">❌</td>
  </tr>
  <tr>
    <td><strong>离线/本地部署</strong></td>
    <td align="center">✅</td>
    <td align="center">✅</td>
    <td align="center">❌</td>
    <td align="center">❌</td>
  </tr>
  <tr>
    <td><strong>可视化界面/UI精美</strong></td>
    <td align="center">✅</td>
    <td align="center">❌ (极简)</td>
    <td align="center">✅</td>
    <td align="center">❌</td>
  </tr>
  <tr>
    <td><strong>无限分支故事情节</strong></td>
    <td align="center">✅</td>
    <td align="center">⚠️ (需要手动努力)</td>
    <td align="center">✅ (但不稳定)</td>
    <td align="center">❌</td>
  </tr>
</table>

| 许可证概览 |
| :--------------- |

本项目由两个具有独立许可证的不同部分组成：

- ✅ 代码: MIT许可证 — 开放用于商业和非商业用途，需要署名。
- 🔒 内容: CC BY-NC-SA 4.0 — 仅限非商业用途，需要署名和相同许可证共享。

> 有关完整许可证详情，请参阅 [LICENSE](./LICENSE)。

| 联系与支持 |
| :---------------- |

* 如果你喜欢这个项目，我们非常欢迎你加入
* If you like this project, we warmly welcome you to join us
[Discord社区](https://discord.gg/PP7EpSzDfU)

| 代码贡献者 |
| :--------------- |

[![Contributors](https://contrib.rocks/image?repo=Narratium/Narratium.ai)](https://github.com/Narratium/Narratium.ai/graphs/contributors)

| 其他 |
| :----- |

感谢所有官方网站测试API赞助商

| 星标增长 |
| :---------- |

[![Stargazers over time](https://starchart.cc/Narratium/Narratium.ai.svg?variant=adaptive)](https://starchart.cc/Narratium/Narratium.ai)

