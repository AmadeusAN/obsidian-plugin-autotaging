# Obsidian AI Vault Organizer (BETA)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-blue?logo=obsidian)](https://obsidian.md/plugins)
[![Python Backend](https://img.shields.io/badge/Backend-Python%20%2B%20Flask-orange)](https://flask.palletsprojects.com/)
[![ChromaDB](https://img.shields.io/badge/Vector%20DB-ChromaDB-green)](https://www.trychroma.com/)

An intelligent Obsidian plugin that automatically organizes your vault using AI. It builds a **hierarchical tag tree** via embedding + hierarchical clustering, assigns meaningful tags to every note, reorganizes files into folders based on the tag hierarchy, and automatically creates bidirectional internal links between related notes.

All heavy AI processing (embedding, clustering, LLM tagging) is handled by a lightweight local Python backend powered by **ChromaDB** and **Moonshot Kimi**.

## 🎥 Demo Video

<!-- Replace the link with your actual demo video (YouTube, Bilibili, etc.) -->
![Demo Video](tmp/2025-12-15%2010-15-31.gif)

## Features

- **Automatic Hierarchical Tag Generation**  
  Uses sentence embeddings + agglomerative hierarchical clustering to build a semantic tag tree. LLM summarizes cluster themes into concise, meaningful tags.

- **Smart Tag Assignment**  
  Every note gets one or more hierarchical tags (e.g., `AI/NeuralNetwork/CNN`).

- **Vault Auto-Organization** (coming soon)  
  Creates folder structure mirroring the tag tree and moves files accordingly.

- **Automatic Bidirectional Links**  
  Finds semantically similar notes via vector similarity search and appends `[[Related]]` links.

- **Local Vector Database**  
  Powered by ChromaDB – fast similarity search and incremental updates.

- **Extensible Backend** (coming soon)
  Easy to swap embedding model (Sentence-Transformers, OpenAI, etc.) or LLM provider.

## Installation
### 1. Set Up the Python Backend

```bash
cd <Plugin_test_folder>/.obsidian/plugins
# Clone the backend (or copy the Python files into a folder)
git clone git@github.com:AmadeusAN/obsidian-plugin-autotaging.git
# Create virtual environment (recommended)
uv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
# Install dependencies
uv pip install -r requirements.txt
```

### 2. enable the Obsidian Plugin
1. Enable the plugin in Obsidian → Settings → Community plugins. It will auto-start the backend server at `http://localhost:5000`. The server will end when you disable the plugin.

### 3. Set Up API Key
write your kimi api key in plugin setting page.

## Usage

1. **Generate Tags for All Files**  
   Open Command Palette → `AI Vault Organizer: Generate tags for all files`  
   The plugin sends all notes to the backend, builds embeddings, performs clustering, and applies generated tags to frontmatter.

2. **Add Internal Links to Current File**  
   Open any note → Command Palette → `AI Vault Organizer: Add internal links to file`  
   Related notes are found via vector similarity and appended under `## Related`.

## Project Structure

```
obsidian-ai-vault-organizer/
├── main.ts                 # Obsidian plugin frontend
├── backend/
│   ├── AI_end.py           # Flask API server
│   ├── vector_db_port.py   # ChromaDB + clustering + LLM logic
│   └── chroma_db/          # Persistent vector database
└── manifest.json
```

## Roadmap

- [ ] Auto-create folders based on tag hierarchy and move files
- [ ] Incremental updates (only process new/changed files)
- [ ] Support Ollama / local LLMs for fully offline use
- [ ] UI for configuring embedding model, LLM provider, similarity threshold
- [ ] Visual tag tree explorer in Obsidian

## Contributing

Contributions are very welcome! Feel free to:
- Open issues for bugs or feature requests
- Submit pull requests (especially for folder organization or local LLM support)

## License

[MIT License](LICENSE)

---

**中文版（可折叠）**

<details>
<summary>点击查看中文说明</summary>

# Obsidian AI Vault Organizer

一个基于 AI 的 Obsidian 智能笔记整理插件，能够自动为整个 Vault 生成层次化的标签体系、为每篇笔记打上语义标签、并基于向量相似度自动添加相关笔记的双向链接。

核心 AI 能力（向量化、层次聚类、标签生成）由本地 Python 后端实现，使用 **ChromaDB** 向量数据库 + **层次聚类** + **大语言模型**（默认 Moonshot Kimi，可替换为 OpenAI、Claude、Ollama 等）。

## 功能亮点

- 自动构建语义层次标签树（embedding + 层次聚类）
- 为每篇笔记智能分配多层级标签
- 根据标签树自动创建文件夹并整理文件（开发中）
- 基于向量相似度自动生成相关笔记的双向链接
- 本地向量数据库，支持快速检索与增量更新
- 后端高度可扩展，支持替换 embedding 模型与 LLM（开发中）

## 安装与使用

（详见上方英文说明）

## 项目结构、技术栈

- 前端：TypeScript + Obsidian Plugin API
- 后端：Python + Flask + ChromaDB + scikit-learn + Moonshot Kimi API
- 核心算法：Sentence Embedding → 层次聚类 → LLM 标签归纳 → 向量检索

## 未来规划

- 自动按标签树创建文件夹并移动文件
- 增量更新（只处理新增/修改笔记）
- 支持 Ollama 本地大模型，完全离线运行
- 提供设置面板配置模型与阈值
- 在 Obsidian 内可视化展示标签树

欢迎提交 Issue 与 PR！

</details>

---
