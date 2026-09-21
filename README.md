# Maestro Illustrator · 分子筛选工作台

将分子相似性聚类、Docking / MM/GBSA 评分、三维结合姿态、指定残基互作筛选与采购决策整合到一个浏览器工作台。

**当前功能基线：v12 / clean source 0.12.0。** 适合已完成虚拟筛选后的人工作用机制复核和候选缩减；候选数量默认不限，也可自定义上限。

- [完整中文功能与使用说明](docs/USER_GUIDE.zh-CN.md)
- [GitHub 首次上传及后续更新](docs/GITHUB_UPLOAD.zh-CN.md)
- [第三方组件与许可证](THIRD_PARTY_NOTICES.md)

## 主要功能

- 导入 SMILES、CSV、TSV、SMI/TXT、SDF、MAE/MAEGZ；支持独立 PDB 受体。
- RDKit 结构验证、二维绘图、分子描述符、规范结构重复检查。
- 完整分子 / Murcko / 通用 Murcko 骨架，Morgan 指纹、Tanimoto 相似性、Butina 聚类。
- 按 MM/GBSA、Docking 或原始顺序保留前 N 个分子，重新聚类并支持恢复全量。
- 二维散点图、结构簇、评分、表格及分子详情联动。
- 蛋白–配体三维预览、口袋表面、残基标签点选放大、距离标注、景深裁切。
- 本机 Schrödinger 原生互作分析；按指定残基的 AND/OR、互作类型、有/无/未确定筛选。
- 人工采购选择、排除、备注；多项目本机保存、30 分钟定时保存及项目 JSON 备份。

## 快速启动

需要 Node.js **22.13+**、npm。克隆或解压源码后，在项目目录执行：

```powershell
npm ci
npm run dev
```

打开 **http://localhost:3000/**。保持终端运行。

网页演示数据为合成示例，评分为模拟值；不要用于采购。

### 可选：本机 Schrödinger 服务

纯二维分析无需 Schrödinger。MAEGZ 原生读取和新的原生互作计算需要自行安装、授权的 Schrödinger 软件。在第二个终端运行：

```powershell
& '你的Schrodinger安装目录\run.exe' python3 scripts/schrodinger_bridge.py --connection-file scripts/schrodinger-connection.json
```

也可在已经启动网页服务后双击 `Start Maestro Illustrator.cmd`，按提示选择安装目录。适配器仅监听本机 `127.0.0.1:8765`，页面自动连接。令牌为本次会话生成，连接 JSON 不应上传。

项目带有已有互作缓存时，即使未启动原生服务也可以查看；重新计算才需要服务。

## 一个典型流程

1. 导入包含 SMILES、Docking、MM/GBSA 的化合物或结构文件。
2. 检查无效结构、重复记录、立体化学及缺失评分。
3. 按 MM/GBSA 保留前 500 个，并选择骨架模式和聚类阈值。
4. 在三维预览中复核口袋、姿态及互作端点。
5. 输入 `A:ARG609, A:ARG758` 等目标残基，选择 **AND** 要求两者都满足，或 **OR** 要求至少一个满足。
6. 查看“列表保留”状态和实际结果数，人工选择初筛候选，数量默认不限，也可自定义上限。
7. 保存到本机并下载项目 JSON 备份，导出采购 CSV。

## 数据与科学边界

分子分析在浏览器完成；原生结构计算通过本机回环接口完成。GitHub 源码不包含研究项目、真实配体库、互作缓存、服务令牌或原部署项目标识。

程序读取已有评分与姿态，不执行新的对接、MM/GBSA、蛋白准备、质子化或坐标叠合。单点突变面板是性质与野生型接触复核，不生成突变结构或预测 ΔΔG。二维投影不是相似性的精确定量坐标。采购、实验活性和供应商信息需人工确认。

本机项目库按浏览器和网站来源隔离；请用 JSON 备份跨设备迁移。GitHub 上传不会同步浏览器里的项目数据。

## 验证和构建

```powershell
npm test
npm run typecheck
npm run build
```

测试覆盖结构解析、规范重复、手性、评分缺失、CSV 转义、聚类分配、前 N 排名、记录身份稳定及采购限制。

采用 React、TypeScript、Vite/vinext、RDKit.js、3Dmol.js。`npm run build` 产生 Worker 及客户端构建；`npm start` 启动本机构建预览。当前仓库不是可直接丢进 GitHub Pages 的静态 HTML 站点；源码托管与网站部署是两件事。

## 仓库内容

```text
app/                 工作台界面与样式
components/          二维/三维展示和界面组件
lib/                 输入解析、项目存储、本机引擎、互作判定
public/              RDKit/WASM、3Dmol、聚类 Worker 等资源
scripts/             本机适配器与通用回归测试
docs/                中文使用与 GitHub 操作指南
```

这是从 v12 最新源码整理的独立干净快照，不携带原仓库历史。应用代码的发布许可证尚未指定；第三方组件仍遵循各自许可证。Schrödinger 本体及许可证不在仓库中。
