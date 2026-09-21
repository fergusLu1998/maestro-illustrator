# Maestro Illustrator 上传 GitHub 与后续更新

这份指南用于 clean 源码目录。不要把整个研究工作目录、项目 JSON 或压缩配体库拖到 GitHub。

## 第一次上传：需要你确认的两件事

1. 仓库名称，例如 `maestro-illustrator`。
2. 公开还是私有。建议先用 Private；以后可以另行决定是否公开和采用何种应用代码许可证。

网页登录不等于 Git 命令行已授权。首次推送可能打开 GitHub 登录/授权界面，请在官方界面自行完成；不要在聊天或源码文件中填写密码、令牌。

## 步骤一：新建空仓库

1. 在已登录的 GitHub 网页打开 `https://github.com/new`。
2. Owner 选择自己的账户，Repository name 输入 `maestro-illustrator`。
3. Description 可填写：`Molecular clustering, docking pose review and compound selection workbench`。
4. 选择 Private（如决定公开则选择 Public）。
5. **不要**勾选初始化 README、.gitignore 或许可证；本地版本已经有 README 和 .gitignore。
6. 点击 Create repository，复制新仓库的 HTTPS 地址。

若使用已有且非空的仓库，应先克隆检查内容，再合并源码；不要执行强制推送覆盖历史。

## 步骤二：准备本地 Git

在 clean 目录打开 PowerShell。先查看是否已由助手初始化：

```powershell
git status
git log -1 --oneline
```

如果提示不是 Git 仓库，才执行：

```powershell
git init -b main
git add .
git commit -m "Initial clean release of Maestro Illustrator v12"
```

若 Git 要求提交身份，使用你自己的名称及 GitHub 的提交邮箱；可以从 GitHub Settings → Emails 复制 noreply 邮箱。以下只设置当前仓库，不更改其他项目：

```powershell
git config user.name '你的GitHub名称'
git config user.email '你的GitHub提交邮箱'
```

## 步骤三：连接并推送

将下面示例地址中的“你的用户名”替换为新仓库实际地址：

```powershell
git remote add origin https://github.com/你的用户名/maestro-illustrator.git
git push -u origin main
```

如已有 origin，先执行 `git remote -v` 核对，不要盲目覆盖。若出现授权页面，完成官方登录后返回终端等待推送结束。

## 步骤四：验收上传成功

- 刷新 GitHub 仓库页，应看到 README、app、components、lib、public、scripts、docs、package.json 和 package-lock.json。
- 确认没有研究用 MAEGZ、项目 JSON、连接 JSON、node_modules、outputs、work、dist。
- 本地 `git status` 应显示工作区干净。
- 用 `git rev-parse HEAD` 与 `git ls-remote origin refs/heads/main` 比较完整提交号，两者应一致。
- 新电脑可 `git clone` 后执行 `npm ci`、`npm test`、`npm run typecheck`、`npm run build`。

仅把 ZIP 作为一个文件上传到仓库，不能替代按文件结构上传源码。ZIP 适合下载和备份。

## 以后怎样更新

在同一个 clean GitHub 工作目录中更新代码，验证后再提交：

```powershell
git status
git diff
npm test
npm run typecheck
npm run build
git add README.md docs app components lib public scripts package.json package-lock.json vite.config.ts
git diff --cached --stat
git commit -m "Describe this update"
git push
```

只添加本次确实改动的路径。若其他设备也更新过仓库，先取回并检查差异，不要用 `git push --force` 处理冲突。不要在含研究数据的上级文件夹执行 `git add .`。

## 上传与部署的区别

GitHub 保存源码与提交记录；它不会自动运行本机 Schrödinger，也不会自动发布原在线工作台。当前构建是 Worker 应用，不能按普通静态网页直接启用 GitHub Pages。

官方参考：[导入本地代码](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)、[创建仓库](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)。
