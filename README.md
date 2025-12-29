# expose

![License](https://img.shields.io/github/license/cerebralatlas/expose)

![Release](https://img.shields.io/github/v/release/cerebralatlas/expose)

![Platform](https://img.shields.io/badge/platform-Windows-blue)

![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-black?logo=bun)

expose is a Windows environment management tool for managing environment variables and creating command aliases.

## Features

- **Environment Variable Management**: Quickly set/delete user-level or system-level environment variables
- **PATH Management**: Easily add directories to system PATH
- **Command Aliases**: Create command aliases to simplify frequently used commands
- **One-click Configuration**: Automatically configure PATH and aliases directory

## Requirements

- Operating System: Windows 10 or later

## Installation

### Option 1: Direct Download (Recommended)

1. Download the latest `expose.exe` from [GitHub Releases](https://github.com/cerebralatlas/expose/releases)
2. Place it in any directory (e.g., `C:\Tools`)
3. Open a terminal in that directory and run `.expose init` to complete PATH configuration
4. Restart the terminal to start using expose

> expose automatically adds the current directory to system PATH - no manual configuration needed.

### Option 2: Build from Source

If you need the latest features or want to customize:

```bash
# Clone the repository
git clone https://github.com/cerebralatlas/expose.git
cd expose

# Install dependencies
bun install

# Compile to standalone executable
bun run build

# Initialize
.\expose init
```

## Usage

### expose add - Environment Variable Management

Set user-level environment variable:

```bash
expose add MY_VAR=hello
```

Set system-level environment variable (requires admin privileges):

```bash
expose add MY_VAR=hello --system
```

Add directory to PATH:

```bash
expose add --path "C:\Users\John\bin"
```

Add directory to the beginning of PATH:

```bash
expose add --path "C:\Users\John\bin" --prepend
```

Delete environment variable:

```bash
expose add --delete MY_VAR
```

### expose init - One-click Initialization (Recommended)

Run this command after installation to complete PATH configuration:

```bash
expose init                     # Auto-detect and add current directory to PATH
expose init --dir "C:\Tools"    # Manually specify directory
```

This command automatically adds the following directories to PATH:

- Directory containing expose.exe
- `~/.bun/bin` (added when Bun is detected)
- `~/Aliases`

> **Note**: Restart your terminal after initialization for changes to take effect.

### expose alias - Command Alias Management

**Smart Current Directory Detection** (Recommended): Navigate to the tool directory and expose the program directly:

```bash
cd C:\Downloads\MyTool
expose alias mytool.exe   # Auto-detected as C:\Downloads\MyTool\mytool.exe
```

Create command alias (with explicit full path):

```bash
expose alias emailcode "C:\Users\John\code.exe"
```

> **How it works**: expose creates lightweight `.bat` wrapper files in the Aliases directory without copying the original program, taking almost no space.

Create alias with default arguments:

```bash
expose alias serve "C:\Users\John\serve.exe" --args "-p 3000"
```

Also add the executable's directory to PATH:

```bash
expose alias serve "C:\Users\John\serve.exe" --path
```

List all aliases:

```bash
expose alias --list
```

Remove an alias:

```bash
expose alias --remove emailcode
```

### expose uninstall - Uninstall expose

Clean up PATH entries added by expose:

```bash
expose uninstall
```

This command will:

- Remove `~/.bun/bin` from PATH
- Remove `~/Aliases` from PATH

> **Note**: Restart your terminal after uninstallation for changes to take effect. The Aliases directory and its alias files are not deleted.

### Global Options

| Option       | Description    |
| ------------ | -------------- |
| `--help, -h` | Show help info |

## Command Reference

### expose add

| Command                                | Description                           |
| -------------------------------------- | ------------------------------------- |
| `expose add VAR=value`                 | Set user-level environment variable   |
| `expose add VAR=value --system`        | Set system-level environment variable |
| `expose add --path "C:\dir"`           | Add directory to PATH                 |
| `expose add --path "C:\dir" --prepend` | Add directory to beginning of PATH    |
| `expose add --delete VAR`              | Delete environment variable           |

### expose init

| Command                       | Description                               |
| ----------------------------- | ----------------------------------------- |
| `expose init`                 | Auto-detect and add current dir to PATH   |
| `expose init --dir "C:\path"` | Manually specify directory to add to PATH |

### expose alias

| Command                                          | Description                         |
| ------------------------------------------------ | ----------------------------------- |
| `expose alias name "C:\path\to\exe"`             | Create command alias                |
| `expose alias name "C:\path" --path`             | Create alias and add dir to PATH    |
| `expose alias name "C:\path" --args "arg1 arg2"` | Create alias with default arguments |
| `expose alias --list`                            | List all aliases                    |
| `expose alias --remove name`                     | Remove alias                        |

### expose uninstall

| Command            | Description                           |
| ------------------ | ------------------------------------- |
| `expose uninstall` | Clean up PATH entries added by expose |

## FAQ

**Q: Downloaded expose.exe is blocked by Windows?**

A: This is a normal security warning since the exe is downloaded from GitHub and is unsigned. Click "More info" → "Still run" to proceed.

**Q: Command not working after `expose init`?**

A: Please restart your terminal or open a new command prompt window for the new PATH configuration to take effect.

**Q: System-level variable changes not taking effect?**

A: System-level environment variables require a computer restart or re-login to fully take effect.

**Q: Where are alias files stored?**

A: Alias files are stored in `%USERPROFILE%\Aliases` directory with `.bat` extension.

**Q: How to view all available aliases?**

A: Run `expose alias --list` to view all created aliases.

**Q: Do aliases use extra disk space?**

A: No. expose only creates lightweight `.bat` wrapper files pointing to the original program without copying any files.

## Project Structure

```
expose/
├── src/
│   ├── cli.ts        # Main entry point
│   ├── index.ts      # Environment variable management (kept for compatibility)
│   └── alias.ts      # Command alias functionality (kept for compatibility)
├── package.json
├── tsconfig.json
├── bun.lock
└── README_zh-CN.md   # Chinese documentation
```

## License

MIT

## Why expose?

Scoop and Chocolatey are excellent package managers for installing software from their repositories. However, when you download a standalone `.exe` tool that isn't in any repository, or need to quickly configure development environment variables, expose is a lighter and more flexible choice.

| Feature | Scoop/Choco | expose |
|---------|-------------|--------|
| Package Manager | Requires repository | Supports any .exe |
| Environment Variables | Limited | Full support |
| Command Aliases | Requires extra tools | Built-in support |
| Lightweight | Requires runtime | Single file execution |

## Contributing

Issues and Pull Requests are welcome!
