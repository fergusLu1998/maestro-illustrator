# Maestro Illustrator

**分子筛选与蛋白–配体互作分析工作台 · Molecular screening and protein–ligand interaction workbench**

[在线使用 / Open workbench](https://pocket-atlas.ferguslu.chatgpt.site/) · [源码 / Source code](https://github.com/fergusLu1998/maestro-illustrator) · [中文完整手册 / Detailed Chinese guide](docs/USER_GUIDE.zh-CN.md)

Maestro Illustrator 将分子相似性、骨架聚类、已有 Docking / MM/GBSA 评分、三维结合姿态和人工候选筛选整合到浏览器中，适用于虚拟筛选之后的结构复核和候选缩减。

Maestro Illustrator combines molecular similarity, scaffold clustering, existing docking/MM/GBSA scores, 3D binding poses, and manual candidate selection in a browser. It supports structural review and candidate prioritization after virtual screening.

**当前功能版本 / Current feature version: v13 · 0.13.0.** README 提供中英对照；当前工作台界面主要使用中文。 / This README is bilingual; the current workbench interface is primarily in Chinese.

## 1. 在线使用 / Use online

打开 [Maestro Illustrator](https://pocket-atlas.ferguslu.chatgpt.site/)，无需安装 Node.js 即可使用浏览器中的结构分析和项目管理。桌面 Chrome 或 Edge 可提供项目文件夹读写支持；首次使用需由操作者选择目录并授权。

Open [Maestro Illustrator](https://pocket-atlas.ferguslu.chatgpt.site/) to use browser-based structure analysis and project management without installing Node.js. Desktop Chrome or Edge supports project-folder access; the operator must select and authorize the folder on first use.

网站公开提供程序界面，不提供共享研究项目库。不同用户的浏览器缓存和本地项目目录彼此独立。不要将演示分子的模拟评分用于实验或订购决策。

The public website provides the application, not a shared research-project database. Browser caches and local project directories remain separate for each user. Demonstration scores are synthetic and must not guide experiments or ordering.

## 2. 功能概览 / Features

| 功能 | Description |
|---|---|
| **分子导入**：SMILES、CSV、TSV、SMI/TXT、SDF、MAE/MAEGZ；支持单独导入 PDB 受体。 | **Import:** SMILES, CSV, TSV, SMI/TXT, SDF, and MAE/MAEGZ; separate PDB receptor import is supported. |
| **结构检查**：RDKit 验证、规范结构去重提示、二维结构和分子描述符。 | **Structure review:** RDKit validation, canonical-structure duplicate flags, 2D depictions, and molecular descriptors. |
| **相似性聚类**：完整分子、Murcko 或通用 Murcko 骨架；Morgan 指纹、Tanimoto 相似性与 Butina 聚类。 | **Clustering:** whole molecules, Murcko scaffolds, or generic Murcko scaffolds; Morgan fingerprints, Tanimoto similarity, and Butina clustering. |
| **前 N 个分析**：按 MM/GBSA、Docking 或原始顺序保留前 N 条有效记录，可恢复全量。 | **Top-N analysis:** retain the first N valid records by MM/GBSA, docking score, or source order; restore the full dataset at any time. |
| **联动阅览**：散点图、结构簇、评分、化合物列表与分子详情同步。 | **Linked views:** scatter plots, clusters, scores, compound tables, and molecular details. |
| **三维姿态**：蛋白–配体复合物、口袋表面、残基标签点选放大、距离和裁切控制。 | **3D review:** protein–ligand complexes, pocket surfaces, clickable residue labels, distance annotations, and clipping controls. |
| **互作筛选**：指定残基、AND/OR、互作类型及“有／无／未确定”筛选；原生计算使用本机 Schrödinger。 | **Interaction filters:** target residues, AND/OR matching, interaction types, and present/absent/unknown results; native calculations use local Schrödinger. |
| **初筛候选清单**：默认不限数量，可自定义上限；每页 20/50/100 条，全选或取消当前页，跨页保留选择。 | **Candidate shortlist:** unlimited by default, with an optional custom cap; 20/50/100 rows per page, page selection/deselection, and persistent selections across pages. |
| **项目管理**：指定目录、启动检索、名称和备注确认、浏览及修改已有项目、关闭前保存确认。 | **Projects:** directory selection, startup discovery, name and note confirmation, opening/editing existing projects, and save prompts before closing. |
| **保存与导出**：每 30 分钟自动保存、JSON 项目备份、候选和分析 CSV；项目文件与浏览器缓存分开。 | **Persistence and export:** autosave every 30 minutes, JSON project backups, candidate/analysis CSV exports, and separate project files and browser caches. |

## 3. 本地运行 / Run locally

需要 **Node.js 22.13+**、npm 和 Git。 / Requires **Node.js 22.13+**, npm, and Git.

```powershell
git clone https://github.com/fergusLu1998/maestro-illustrator.git
cd maestro-illustrator
npm ci
npm run dev
```

打开 **http://localhost:3000/**，并保持终端运行。网页托管与源码托管是两件事：克隆仓库不会自动发布一个网站。

Open **http://localhost:3000/** and keep the terminal running. Hosting source code and hosting a running website are separate: cloning the repository does not publish a website.

## 4. 可选本机引擎 / Optional local engine

二维结构分析、聚类和项目目录管理不需要 Schrödinger。浏览器可读取受支持的结构文件；要使用 Schrödinger 原生读取和重新计算原生互作，使用者需自行安装并授权 Schrödinger。已有项目中的缓存互作可以离线阅览，无需重新计算。

2D structure analysis, clustering, and project-folder management do not require Schrödinger. The browser can read supported structure files; Schrödinger-native reading and new native interaction calculations require a separately installed and licensed Schrödinger environment. Cached interactions in a saved project remain viewable without recalculation.

**本地源码版本 / Local source checkout:** 在第二个 PowerShell 终端运行以下命令，将安装路径替换为自己的路径。也可在网页服务启动后双击 `Start Maestro Illustrator.cmd`，按提示选择安装目录。

In a second PowerShell terminal, run the command below with your own installation path. Alternatively, after starting the web server, double-click `Start Maestro Illustrator.cmd` and follow the installation-directory prompt.

```powershell
& 'C:\Path\To\Schrodinger\run.exe' python3 .\scripts\schrodinger_bridge.py --connection-file .\scripts\schrodinger-connection.json
```

**在线工作台 / Hosted workbench:** 从网页的“启用本机 Schrödinger”入口下载并解压适配器。其服务允许在线工作台连接；GitHub 中的适配器默认面向 `localhost:3000`。在解压目录中，可直接指定自己的 Schrödinger 路径启动：

Download and extract the adapter through “启用本机 Schrödinger” (Enable local Schrödinger) on the hosted workbench. That adapter permits the hosted origin; the adapter in this repository targets `localhost:3000` by default. From the extracted folder, start it with your own Schrödinger path:

```powershell
& 'C:\Path\To\Schrodinger\run.exe' python3 .\schrodinger_bridge.py --connection-file .\schrodinger-connection.json --open-site
```

服务只监听本机 `127.0.0.1:8765`，使用会话令牌；保持服务终端打开，并在浏览器提示时允许访问本地服务。不要公开或提交连接 JSON。仓库不包含 Schrödinger 软件、许可证或安装文件。

The service listens only on `127.0.0.1:8765` and uses a session token. Keep its terminal open and allow local-service access when prompted by the browser. Do not publish or commit connection JSON files. Schrödinger software, licenses, and installers are not included.

## 5. 典型工作流程 / Typical workflow

1. **选择项目目录 / Select a project directory.** 在“分析项目”中选择保存地址并授权；未设置目录时，程序明确使用浏览器存储。 / Select and authorize a folder in the project area. Without a directory, the application explicitly uses browser storage.
2. **导入与确认 / Import and confirm.** 上传分子，检查字段映射；分析完成后确认项目名称和备注。 / Import molecules, review column mapping, then confirm the project name and notes after analysis.
3. **检查数据 / Review data quality.** 复核无效结构、重复记录、立体化学和缺失评分。 / Review invalid structures, duplicates, stereochemistry, and missing scores.
4. **聚类与缩减 / Cluster and narrow down.** 选择完整分子或骨架模式，设置阈值；需要时先保留前 N 个分子。 / Choose a whole-molecule or scaffold mode and a threshold; optionally restrict analysis to the top N records.
5. **复核互作 / Review interactions.** 在三维视图检查姿态和口袋。多个指定残基可使用 AND（全部满足）或 OR（任一满足）；未计算的记录保持“未确定”。 / Inspect poses and pockets in 3D. Use AND for all specified residues or OR for any residue; uncomputed records remain “unknown.”
6. **建立初筛清单 / Build the shortlist.** 单个或整页选择候选，添加备注，按需调整数量上限。 / Select individual molecules or a whole page, add notes, and adjust the candidate cap if needed.
7. **保存与关闭 / Save and close.** 保存到项目目录，必要时下载 JSON 备份并导出 CSV。关闭标签时选择保存、放弃未保存更改或取消。 / Save to the project directory, download a JSON backup when needed, and export CSV. When closing a tab, choose to save, discard unsaved changes, or cancel.

## 6. 项目文件与隐私 / Project files and privacy

- **项目目录 / Project directory:** 保存可迁移的 JSON，包含结构、分析参数、候选、备注和互作结果；启动时在授权有效的情况下检索目录顶层项目文件。 / Stores portable JSON containing structures, analysis settings, candidates, notes, and interaction results. Startup discovery scans top-level project files when permission remains valid.
- **缓存 / Cache:** 浏览器独立 IndexedDB 存储，与项目目录分开；不同网站来源和浏览器的缓存不共享。 / Uses separate browser IndexedDB storage; caches are not shared between origins or browsers.
- **授权 / Permission:** 浏览器可能收回目录授权，届时点击“授权并检索”。清除浏览器数据不会删除已保存的磁盘项目文件。 / Browsers may revoke directory permission; use “授权并检索” (Authorize and scan) to restore access. Clearing browser data does not delete saved project files on disk.
- **关闭 / Closing:** 关闭项目不删除文件；“不保存关闭”放弃上次保存后的更改。 / Closing a project does not delete its file; closing without saving discards changes since the last save.
- **数据处理 / Processing:** 分子分析在浏览器中进行，原生计算通过本机回环接口完成。源码仓库不包含研究项目、真实配体库、运行凭据或连接令牌。 / Molecular analysis runs in the browser, with native calculations through the local loopback service. The source repository excludes research projects, real ligand libraries, runtime credentials, and connection tokens.

## 7. 科学边界 / Scientific scope and limitations

程序读取已有评分和坐标，**不执行新的对接、MM/GBSA、蛋白准备、质子化或坐标叠合**。单点突变面板用于性质和野生型接触复核，**不生成突变结构，也不预测 ΔΔG**。

The application reads existing scores and coordinates. It **does not run new docking, MM/GBSA, protein preparation, protonation, or coordinate alignment**. The single-residue mutation panel supports property and wild-type-contact review; it **does not generate mutant structures or predict ΔΔG**.

二维投影用于导航，不是精确相似性坐标；Butina 成员与中心满足阈值，不保证簇内任意两者都满足。几何接触和计算评分不能替代实验活性验证。供应商、货号、盐型、立体化学、纯度和供货情况需人工复核。

The 2D projection is for navigation, not an exact similarity coordinate system. Butina members satisfy the threshold relative to their cluster center, not necessarily to every other member. Geometric contacts and computational scores do not replace experimental validation. Supplier details, catalog IDs, salt forms, stereochemistry, purity, and availability require manual review.

## 8. 开发与验证 / Development and validation

```powershell
npm test
npm run typecheck
npm run build
npm start
```

测试覆盖结构解析、重复记录、手性、评分缺失、CSV 转义、聚类、前 N 排名、候选选择，以及项目文件检索、备注写入、外部修改检测和失败写入保护。文件夹授权由操作者通过浏览器完成。

Tests cover structure parsing, duplicates, chirality, missing scores, CSV escaping, clustering, top-N ranking, candidate selection, project-file discovery, note updates, external-change detection, and failed-write protection. Folder authorization is completed by the operator through the browser.

技术栈为 React、TypeScript、Vite/vinext、RDKit.js 和 3Dmol.js。构建生成 Worker 与客户端资源；`npm start` 启动本地生产构建预览，使用终端显示的地址。本项目不是可直接上传到 GitHub Pages 的静态 HTML 网站。

Built with React, TypeScript, Vite/vinext, RDKit.js, and 3Dmol.js. Builds produce a Worker and client assets; `npm start` previews the production build locally at the address printed in the terminal. This is not a static HTML website that can be deployed directly to GitHub Pages.

```text
app/          工作台界面与样式 / Workbench interface and styles
components/   二维、三维和 UI 组件 / 2D, 3D, and UI components
lib/          解析、存储、引擎与互作 / Parsing, storage, engine, and interactions
public/       化学引擎与浏览器资源 / Chemistry engine and browser assets
scripts/      本机适配器和测试 / Local adapter and tests
docs/         使用和维护文档 / Usage and maintenance documentation
```

## 9. 文档与许可证 / Documentation and licensing

- [完整中文使用说明 / Detailed Chinese user guide](docs/USER_GUIDE.zh-CN.md)
- [GitHub 更新指南（中文） / GitHub maintenance guide (Chinese)](docs/GITHUB_UPLOAD.zh-CN.md)
- [第三方组件与许可证 / Third-party notices and licenses](THIRD_PARTY_NOTICES.md)

应用代码尚未指定开源许可证；公开仓库不等同于授予任意修改或再分发许可。第三方组件遵循各自许可证，Schrödinger 需单独安装并获得授权。

An open-source license has not yet been selected for the application code; a public repository does not itself grant unrestricted modification or redistribution rights. Third-party components retain their respective licenses. Schrödinger must be installed and licensed separately.
