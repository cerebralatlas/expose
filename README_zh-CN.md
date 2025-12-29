# expose

![License](https://img.shields.io/github/license/cerebralatlas/expose)

![Release](https://img.shields.io/github/v/release/cerebralatlas/expose)

![Platform](https://img.shields.io/badge/platform-Windows-blue)

![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-black?logo=bun)

expose 是一个 Windows 环境管理工具，用于管理环境变量和创建命令别名。

## 功能特性

- **环境变量管理**：快速设置、删除用户级或系统级环境变量
- **PATH 管理**：便捷地将目录添加到系统 PATH
- **命令别名**：创建命令别名以简化常用命令的调用
- **一键配置**：自动配置 PATH 和别名目录

## 环境要求

- 操作系统：Windows 10 或更高版本

## 安装

### 方式一：直接下载（推荐）

1. 从 [GitHub Releases](https://github.com/cerebralatlas/expose/releases) 下载最新的 `expose.exe`
2. 放入任意目录（如 `C:\Tools`）
3. 在该目录下打开终端，运行 `.\expose init` 完成 PATH 配置
4. 重启终端，开始使用

> expose 会自动将当前所在目录添加到系统 PATH，无需手动配置。

### 方式二：从源码编译

如果你需要最新功能或自定义修改：

```bash
# 克隆项目
git clone https://github.com/cerebralatlas/expose.git
cd expose

# 安装依赖
bun install

# 编译为独立可执行文件
bun run build

# 初始化
.\expose init
```

## 使用方法

### expose add - 环境变量管理

设置用户级环境变量：

```bash
expose add MY_VAR=hello
```

设置系统级环境变量（需要管理员权限）：

```bash
expose add MY_VAR=hello --system
```

添加目录到 PATH：

```bash
expose add --path "C:\Users\John\bin"
```

将目录添加到 PATH 开头：

```bash
expose add --path "C:\Users\John\bin" --prepend
```

删除环境变量：

```bash
expose add --delete MY_VAR
```

### expose init - 一键初始化（推荐）

首次安装后运行此命令完成 PATH 配置：

```bash
expose init                     # 自动检测并添加当前目录到 PATH
expose init --dir "C:\Tools"    # 手动指定目录
```

此命令会自动将以下目录添加到 PATH：

- expose.exe 所在目录
- `~/.bun/bin` (检测到 Bun 环境时添加)
- `~/Aliases`

> **注意**：初始化后需要重启终端才能生效。

### expose alias - 命令别名管理

**智能识别当前目录**（推荐用法）：进入工具目录后，直接暴露当前目录下的程序：

```bash
cd C:\Downloads\MyTool
expose alias mytool.exe   # 自动识别为 C:\Downloads\MyTool\mytool.exe
```

创建命令别名（显式指定完整路径）：

```bash
expose alias emailcode "C:\Users\John\code.exe"
```

> **原理**：expose 会在 Aliases 目录下创建轻量级的 `.bat` 垫片文件，不会复制原始程序，几乎不占用空间。

创建带默认参数的别名：

```bash
expose alias serve "C:\Users\John\serve.exe" --args "-p 3000"
```

同时将可执行文件所在目录添加到 PATH：

```bash
expose alias serve "C:\Users\John\serve.exe" --path
```

列出所有别名：

```bash
expose alias --list
```

删除别名：

```bash
expose alias --remove emailcode
```

### expose uninstall - 卸载 expose

清理 expose 添加到 PATH 的条目：

```bash
expose uninstall
```

此命令会：

- 将 `~/.bun/bin` 从 PATH 中移除
- 将 `~/Aliases` 从 PATH 中移除

> **注意**：卸载后需要重启终端才能生效。Aliases 目录和其中的别名文件不会被删除。

### 全局选项

| 选项         | 说明         |
| ------------ | ------------ |
| `--help, -h` | 显示帮助信息 |

## 命令参考

### expose add

| 命令                                   | 说明                   |
| -------------------------------------- | ---------------------- |
| `expose add VAR=value`                 | 设置用户级环境变量     |
| `expose add VAR=value --system`        | 设置系统级环境变量     |
| `expose add --path "C:\dir"`           | 将目录添加到 PATH      |
| `expose add --path "C:\dir" --prepend` | 将目录添加到 PATH 开头 |
| `expose add --delete VAR`              | 删除环境变量           |

### expose init

| 命令                          | 说明                          |
| ----------------------------- | ----------------------------- |
| `expose init`                 | 自动检测并添加当前目录到 PATH |
| `expose init --dir "C:\path"` | 手动指定目录添加到 PATH       |

### expose alias

| 命令                                             | 说明                      |
| ------------------------------------------------ | ------------------------- |
| `expose alias name "C:\path\to\exe"`             | 创建命令别名              |
| `expose alias name "C:\path" --path`             | 创建别名并添加目录到 PATH |
| `expose alias name "C:\path" --args "arg1 arg2"` | 创建带默认参数的别名      |
| `expose alias --list`                            | 列出所有别名              |
| `expose alias --remove name`                     | 删除别名                  |

### expose uninstall

| 命令               | 说明                         |
| ------------------ | ---------------------------- |
| `expose uninstall` | 清理 expose 添加的 PATH 条目 |

## 常见问题

**Q: 下载的 expose.exe 被 Windows 拦截？**

A: 这是正常的安全警告。因为 exe 是从 GitHub 下载的且未签名，你可以点击"更多信息"→"仍要运行"来执行。

**Q: 运行 `expose init` 后命令无法使用？**

A: 请重启终端或重新打开命令提示符窗口，使新的 PATH 配置生效。

**Q: 系统级变量修改后不生效？**

A: 系统级环境变量需要重启计算机或重新登录才能完全生效。

**Q: 别名文件存储在什么位置？**

A: 别名文件存储在 `%USERPROFILE%\Aliases` 目录下，扩展名为 `.bat`。

**Q: 如何查看所有可用的别名？**

A: 运行 `expose alias --list` 查看所有已创建的别名。

**Q: 使用别名会占用额外空间吗？**

A: 不会。expose 只创建轻量级的 `.bat` 垫片文件指向原始程序，不会复制任何文件。

## 项目结构

```
expose/
├── src/
│   ├── cli.ts        # 主入口文件
│   ├── index.ts      # 环境变量管理功能（保留用于兼容）
│   └── alias.ts      # 命令别名功能（保留用于兼容）
├── package.json
├── tsconfig.json
└── bun.lock
```

## 许可证

MIT

## 与 Scoop/Choco 的区别

Scoop 和 Chocolatey 是优秀的包管理器，用于安装仓库中存在的软件。但当你下载了一个仓库里没有的独立 `.exe` 工具，或者需要快速配置开发环境变量时，expose 是更轻量、更灵活的选择。

| 特性         | Scoop/Choco    | expose        |
| ------------ | -------------- | ------------- |
| 包管理器     | 需要在仓库中   | 支持任意 .exe |
| 环境变量管理 | 有限           | 完整支持      |
| 命令别名     | 需安装额外工具 | 内置支持      |
| 轻量级       | 需要安装运行时 | 单文件运行    |

## 贡献

欢迎提交 Issue 和 Pull Request。
