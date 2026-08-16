# LKM-on-VSCode

在 VS Code 中克隆并编辑 LKM 平台的 blog 系列（Git 托管博客）。

## 安装
`pnpm install && pnpm run compile && pnpm run package`，在 VS Code 扩展面板安装生成的 `lkm-on-vscode-0.0.1.vsix`。

## 使用
1. 设置 `lkm.serverUrl`（LKM 后端地址）。
2. 执行命令 `LKM: Clone Blog`，输入用户名密码，选择系列与本地目录。
3. 编辑后 `LKM: Push` 推送；收到远端改动用 `LKM: Pull` 拉取。

## 凭证
用户名与密码存入 VS Code 安全存储（SecretStorage），clone 时内联于 git URL，首次推送可能提示保存 git 凭证。
