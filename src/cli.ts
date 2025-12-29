/**
 * Expose - Windows Environment Management Tool
 * Usage:
 *   expose add VAR=value              Add user-level variable
 *   expose add VAR=value --system     Add system-level variable (requires admin)
 *   expose add --path "C:\path\to\dir"  Add directory to PATH
 *   expose add --delete VAR           Delete environment variable
 *   expose init                       Setup PATH for expose (run once)
 *   expose init --dir "C:\path"       Setup with custom directory
 *   expose alias name "C:\path\to\exe"  Create command alias
 *   expose alias name "C:\path\to\exe" --args "arg1 arg2"  With default args
 *   expose alias name "C:\path\to\exe" --path  Also add exe dir to PATH
 *   expose alias --list               List all aliases
 *   expose alias --remove name        Remove alias
 *   expose uninstall                  Remove PATH entries added by expose
 */
import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const args = process.argv.slice(2);

if (args.length === 0) {
  showHelp();
  process.exit(0);
}

const subcommand = args[0].toLowerCase();
const subArgs = args.slice(1);

switch (subcommand) {
  case "add":
    await handleAdd(subArgs);
    break;
  case "alias":
    await handleAlias(subArgs);
    break;
  case "init":
    await handleInit(subArgs);
    break;
  case "uninstall":
    await handleUninstall(subArgs);
    break;
  case "help":
  case "--help":
  case "-h":
    showHelp();
    break;
  default:
    console.error(`❌ Unknown command: ${subcommand}`);
    showHelp();
    process.exit(1);
}

function showHelp() {
  console.log(`
🔧 Expose - Windows Environment Management Tool

Usage:
  expose add VAR=value              Add user-level variable
  expose add VAR=value --system     Add system-level variable (requires admin)
  expose add --path "C:\\path\\to\\dir"  Add directory to PATH
  expose add --delete VAR           Delete environment variable
  expose init                       Setup PATH for expose (run once)
  expose init --dir "C:\\path"      Setup with custom directory
  expose alias name "C:\\path\\to\\exe"  Create command alias
  expose alias name "C:\\path\\to\\exe" --args "arg1 arg2"  With default args
  expose alias name "C:\\path\\to\\exe" --path  Also add exe dir to PATH
  expose alias --list               List all aliases
  expose alias --remove name        Remove alias
  expose uninstall                  Remove PATH entries added by expose
  expose --help                     Show this help

Options for "add":
  --system      Set system-level variable (requires admin)
  --prepend     Add to beginning of PATH
  --help, -h    Show help for add command

Options for "init":
  --dir         Specify custom directory to add to PATH
  --help, -h    Show help for init command

Options for "alias":
  --path        Also add executable directory to PATH
  --args        Default arguments for the alias
  --list, -l    List all aliases
  --remove      Remove an alias
  --help, -h    Show help for alias command

Examples:
  expose add MY_VAR=hello
  expose add PATH_VAR=C:\\bin --system
  expose add --path "C:\\Users\\John\\bin"
  expose add --delete OLD_VAR
  expose init
  expose init --dir "C:\\Tools"
  expose alias emailcode "C:\\Users\\John\\code.exe"
  expose alias serve "C:\\Users\\John\\serve.exe" --path
  expose alias --list
  expose alias --remove emailcode
  expose uninstall
`);
}

// ==================== ADD COMMAND ====================

async function handleAdd(addArgs: string[]) {
  if (addArgs.length === 0 || addArgs.includes("--help") || addArgs.includes("-h")) {
    showAddHelp();
    process.exit(0);
  }

  const isSystem = addArgs.includes("--system");
  const isDelete = addArgs.includes("--delete");
  const isPath = addArgs.includes("--path");
  const prepend = addArgs.includes("--prepend");

  const cleanArgs = addArgs.filter((a) => !a.startsWith("--"));
  const targetArg = cleanArgs[0];

  if (isPath) {
    if (!targetArg) {
      console.error("❌ Error: Missing path argument");
      console.error("Usage: expose add --path \"C:\\path\\to\\dir\"");
      process.exit(1);
    }
    await handlePathMode(targetArg, prepend, isSystem);
    return;
  }

  if (isDelete) {
    if (!targetArg) {
      console.error("❌ Error: Missing variable name");
      console.error("Usage: expose add --delete VAR_NAME");
      process.exit(1);
    }
    await handleDeleteMode(targetArg, isSystem);
    return;
  }

  if (!targetArg || !targetArg.includes("=")) {
    console.error("❌ Error: Invalid argument format. Expected VAR=value");
    console.error("Usage: expose add VAR=value [--system]");
    process.exit(1);
  }

  const [name, ...valueParts] = targetArg.split("=");
  const value = valueParts.join("=");

  if (!name) {
    console.error("❌ Error: Variable name cannot be empty");
    process.exit(1);
  }

  const varNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  if (!varNameRegex.test(name)) {
    console.error(
      "❌ Error: Invalid variable name. Must start with letter or underscore, and contain only letters, numbers, and underscores"
    );
    process.exit(1);
  }

  await handleSetMode(name, value, isSystem);
}

function showAddHelp() {
  console.log(`
📝 Expose Add - Environment Variable Management

Usage:
  expose add VAR=value              Add user-level variable
  expose add VAR=value --system     Add system-level variable (requires admin)
  expose add --path "C:\\path\\to\\dir"  Add directory to PATH
  expose add --delete VAR           Delete environment variable

Options:
  --system      Set system-level variable (requires admin)
  --prepend     Add to beginning of PATH
  --help, -h    Show this help

Examples:
  expose add MY_VAR=hello
  expose add PATH_VAR=C:\\bin --system
  expose add --path "C:\\Users\\John\\bin"
  expose add --delete OLD_VAR
`);
}

function showInitHelp() {
  console.log(`
📝 Expose Init - Initialize expose PATH Configuration

Usage:
  expose init                       Setup PATH for expose (auto-detect directory)
  expose init --dir "C:\\path"      Setup with custom directory

Options:
  --dir         Specify custom directory to add to PATH
  --help, -h    Show this help

Examples:
  expose init                       # Auto-detect and add current directory
  expose init --dir "C:\\Tools"     # Add specific directory to PATH

Note: This command adds the expose directory, ~/.bun/bin, and ~/Aliases to PATH.
`);
}

// ==================== ALIAS COMMAND ====================

async function handleAlias(aliasArgs: string[]) {
  if (aliasArgs.length === 0 || aliasArgs.includes("--help") || aliasArgs.includes("-h")) {
    showAliasHelp();
    process.exit(0);
  }

  const shouldAddToPath = aliasArgs.includes("--path");
  const withArgs = aliasArgs.find((a) => a.startsWith("--args="))?.replace("--args=", "");
  const remove = aliasArgs.includes("--remove");
  const listAliases = aliasArgs.includes("--list") || aliasArgs.includes("-l");

  const cleanArgs = aliasArgs.filter((a) => !a.startsWith("--"));
  const aliasName = cleanArgs[0];
  const targetExe = cleanArgs[1];

  if (remove) {
    if (!aliasName) {
      console.error("❌ Error: Missing alias name");
      console.error("Usage: expose alias --remove aliasname");
      process.exit(1);
    }
    await handleRemoveAlias(aliasName);
  } else if (listAliases) {
    await handleListAliases();
  } else {
    if (!aliasName || !targetExe) {
      console.error("❌ Error: Missing alias name or executable path");
      console.error("Usage: expose alias name \"C:\\path\\to\\exe\" [--path]");
      process.exit(1);
    }

    const aliasRegex = /^[a-zA-Z_][a-zA-Z0-9_\-\.]*$/;
    if (!aliasRegex.test(aliasName)) {
      console.error(
        "❌ Error: Invalid alias name. Must contain only letters, numbers, hyphens, underscores, and dots"
      );
      process.exit(1);
    }

    await handleCreateAlias(aliasName, targetExe, withArgs, shouldAddToPath);
  }
}

function showAliasHelp() {
  console.log(`
📝 Expose Alias - Command Alias Management

Usage:
  expose alias name "C:\\path\\to\\exe"         Create command alias
  expose alias name "C:\\path\\to\\exe" --path  Also add exe dir to PATH
  expose alias name "C:\\path\\to\\exe" --args "arg1 arg2"  With default args
  expose alias --list                          List all aliases
  expose alias --remove name                   Remove alias
  expose alias --help                          Show this help

Options:
  --path        Also add executable directory to PATH
  --args        Default arguments for the alias
  --list, -l    List all aliases
  --remove      Remove an alias
  --help, -h    Show this help

Examples:
  expose alias emailcode "C:\\Users\\John\\code.exe"
  expose alias serve "C:\\Users\\John\\serve.exe" --path
  expose alias --list
  expose alias --remove emailcode

Note: Aliases are stored in %USERPROFILE%\\Aliases directory
`);
}

// ==================== ADD FUNCTIONS ====================

async function handleSetMode(name: string, value: string, isSystem: boolean) {
  const target = isSystem ? "Machine" : "User";
  const targetLabel = isSystem ? "system" : "user";

  const escapedName = name.replace(/"/g, '`"');
  const escapedValue = value.replace(/"/g, '`"');
  const psCommand = `[System.Environment]::SetEnvironmentVariable("${escapedName}", "${escapedValue}", "${target}")`;

  console.log(`🔧 Setting ${targetLabel}-level variable: ${name}=${value}`);

  const code = await execPowerShell(psCommand);
  if (code === 0) {
    console.log(`✅ Successfully set ${targetLabel}-level variable: ${name}`);
    if (isSystem) {
      console.log("ℹ️  Note: System variables require a restart or re-login to take effect.");
    }
  } else {
    console.error(`❌ Failed to set environment variable (exit code: ${code})`);
    process.exit(1);
  }
}

async function handlePathMode(p: string, prepend: boolean, isSystem: boolean) {
  const normalizedPath = p.replace(/\/$/, "").replace(/\\+$/, "");
  const target = isSystem ? "Machine" : "User";
  const targetLabel = isSystem ? "system" : "user";

  console.log(`🔧 Adding to ${targetLabel} PATH: ${normalizedPath}`);

  const psScript = `
    $path = [Environment]::GetEnvironmentVariable("PATH", "${target}")
    $paths = $path -split ';'
    if ($paths -contains "${normalizedPath}") {
        Write-Host "Path already exists in PATH"
        exit 0
    }
    if (${prepend}) {
        $newPath = "${normalizedPath};" + $path
    } else {
        $newPath = $path + ";${normalizedPath}"
    }
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "${target}")
    Write-Host "Successfully added to PATH"
  `;

  const code = await execPowerShell(psScript);
  if (code === 0) {
    console.log(`✅ Successfully added to ${targetLabel} PATH`);
    console.log("ℹ️  Note: You may need to restart your terminal to use the new PATH.");
  } else {
    console.error(`❌ Failed to add to PATH (exit code: ${code})`);
    process.exit(1);
  }
}

async function handleDeleteMode(name: string, isSystem: boolean) {
  const target = isSystem ? "Machine" : "User";
  const targetLabel = isSystem ? "system" : "user";

  console.log(`🔧 Deleting ${targetLabel}-level variable: ${name}`);

  const escapedName = name.replace(/"/g, '`"');
  const psCommand = `[System.Environment]::SetEnvironmentVariable("${escapedName}", $null, "${target}")`;

  const code = await execPowerShell(psCommand);
  if (code === 0) {
    console.log(`✅ Successfully deleted ${targetLabel}-level variable: ${name}`);
  } else {
    console.error(`❌ Failed to delete environment variable (exit code: ${code})`);
    process.exit(1);
  }
}

async function handleInit(initArgs: string[]) {
  if (initArgs.includes("--help") || initArgs.includes("-h")) {
    showInitHelp();
    process.exit(0);
  }

  // Parse --dir argument
  const dirIndex = initArgs.indexOf("--dir");
  const customDir = dirIndex !== -1 && initArgs[dirIndex + 1];

  console.log("🔧 Initializing expose...\n");

  const userProfile = os.homedir();
  const bunBinDir = path.join(userProfile, ".bun", "bin");
  const aliasDir = path.join(userProfile, "Aliases");

  // Bootstrap: add expose.exe directory to PATH
  const exposeDir = customDir || path.dirname(process.execPath);
  console.log(`📁 Adding expose directory to PATH: ${exposeDir}`);
  await addDirToPath(exposeDir);

  const currentPath = await getUserPath();
  const paths = currentPath.split(";");

  let modified = false;

  if (!paths.includes(bunBinDir)) {
    try {
      await fs.promises.access(bunBinDir);
      console.log(`📦 Adding .bun\\bin to PATH...`);
      await addToPath(bunBinDir);
      modified = true;
    } catch {
      console.log(`ℹ️  .bun\\bin not found (Bun not installed), skipping`);
    }
  } else {
    console.log(`ℹ️  .bun\\bin already in PATH`);
  }

  if (!paths.includes(aliasDir)) {
    console.log(`📁 Adding Aliases to PATH...`);
    await addToPath(aliasDir);
    modified = true;
  } else {
    console.log(`ℹ️  Aliases already in PATH`);
  }

  console.log("");
  if (modified) {
    console.log("✅ Initialization complete!");
    console.log("");
    console.log("Please RESTART your terminal to use the commands.");
    console.log("");
    console.log("Usage:");
    console.log("  expose add MY_VAR=hello          # Set environment variable");
    console.log("  expose add --path \"C:\\dir\"      # Add to PATH");
    console.log("  expose alias cmd \"C:\\exe\"       # Create alias");
  } else {
    console.log("✅ Already configured! Just restart your terminal.");
  }
}

async function handleUninstall(uninstallArgs: string[]) {
  const userProfile = os.homedir();
  const bunBinDir = path.join(userProfile, ".bun", "bin");
  const aliasDir = path.join(userProfile, "Aliases");

  console.log("🗑️  Expose Uninstall\n");
  console.log("The following PATH entries will be removed:\n");
  console.log(`  1. ${bunBinDir}`);
  console.log(`  2. ${aliasDir}`);
  console.log("");
  console.log("Note: Alias files in the Aliases directory will NOT be deleted.");
  console.log("");

  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question("Continue? (y/N): ", (ans) => {
      rl.close();
      resolve(ans);
    });
  });

  if (answer.toLowerCase() !== "y") {
    console.log("❌ Uninstall cancelled.");
    process.exit(0);
  }

  console.log("\n🔧 Removing PATH entries...\n");

  let removedCount = 0;

  const bunRemoved = await removeFromPath(bunBinDir);
  if (bunRemoved) {
    console.log(`✅ Removed: ${bunBinDir}`);
    removedCount++;
  } else {
    console.log(`ℹ️  Not in PATH (skipped): ${bunBinDir}`);
  }

  const aliasRemoved = await removeFromPath(aliasDir);
  if (aliasRemoved) {
    console.log(`✅ Removed: ${aliasDir}`);
    removedCount++;
  } else {
    console.log(`ℹ️  Not in PATH (skipped): ${aliasDir}`);
  }

  console.log("");
  if (removedCount > 0) {
    console.log(`✅ Uninstalled successfully! (${removedCount} entry/entries removed)`);
    console.log("");
    console.log("⚠️  Please RESTART your terminal to apply changes.");
  } else {
    console.log("✅ No PATH entries were found. Nothing to remove.");
  }
}

// ==================== ALIAS FUNCTIONS ====================

async function handleListAliases() {
  const userProfile = process.env.USERPROFILE || process.env.HOME || "";
  const aliasDir = path.join(userProfile, "Aliases");

  if (!fs.existsSync(aliasDir)) {
    console.log("📋 No aliases found. Use 'expose alias name \"path\\to\\exe\"' to create one.");
    return;
  }

  const files = fs.readdirSync(aliasDir).filter((f) => f.endsWith(".bat"));

  if (files.length === 0) {
    console.log("📋 No aliases found. Use 'expose alias name \"path\\to\\exe\"' to create one.");
    return;
  }

  console.log("📋 Configured Aliases:\n");

  for (const file of files) {
    const aliasName = file.replace(".bat", "");
    const aliasPath = path.join(aliasDir, file);
    const content = fs.readFileSync(aliasPath, "utf8");

    const match = content.match(/"([^"]+)"/);
    const target = match ? match[1] : "unknown";

    console.log(`  ${aliasName.padEnd(15)} -> ${target}`);
  }

  console.log("");
  console.log(`Total: ${files.length} alias(es)`);
}

async function handleCreateAlias(
  aliasName: string,
  targetExe: string,
  defaultArgs: string | undefined,
  addToPath: boolean
) {
  const userProfile = process.env.USERPROFILE || process.env.HOME || "";
  const aliasDir = path.join(userProfile, "Aliases");

  // 智能路径识别：相对路径 → 绝对路径
  let resolvedExePath = targetExe;
  if (!path.isAbsolute(targetExe)) {
    resolvedExePath = path.resolve(process.cwd(), targetExe);
    console.log(`🔧 Resolved relative path to: ${resolvedExePath}`);
  }

  // 验证文件存在
  if (!fs.existsSync(resolvedExePath)) {
    console.error(`❌ File not found: ${resolvedExePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(aliasDir)) {
    fs.mkdirSync(aliasDir, { recursive: true });
    console.log(`🔧 Created Aliases directory: ${aliasDir}`);
  }

  const aliasPath = path.join(aliasDir, `${aliasName}.bat`);
  if (fs.existsSync(aliasPath)) {
    console.log(`⚠️  Alias "${aliasName}" already exists. Use --remove to delete it first.`);
    process.exit(1);
  }

  if (addToPath) {
    const exeDir = path.dirname(resolvedExePath);
    console.log(`🔧 Adding executable directory to PATH: ${exeDir}`);
    await addDirToPath(exeDir);
  }

  const escapedExe = resolvedExePath.replace(/"/g, '`"');
  const escapedArgs = defaultArgs ? defaultArgs.replace(/"/g, '`"') : "";

  let batContent: string;
  if (defaultArgs) {
    batContent = `@echo off
"${escapedExe}" ${escapedArgs} %*`;
  } else {
    batContent = `@echo off
"${escapedExe}" %*`;
  }

  fs.writeFileSync(aliasPath, batContent, { encoding: "utf8" });

  await ensureAliasDirInPath(userProfile, aliasDir);

  console.log(`✅ Created alias: ${aliasName}`);
  console.log(`   Points to: ${resolvedExePath}`);
  if (defaultArgs) {
    console.log(`   Default args: ${defaultArgs}`);
  }
  console.log(`   Location: ${aliasPath}`);
  console.log("");
  console.log("ℹ️  Note: Close and reopen your terminal to use the new alias.");

  const currentPath = await getPath();
  if (!currentPath.includes(aliasDir)) {
    console.log("");
    console.log("⚠️  Aliases directory is not in PATH. Adding it now...");
    await addDirToPath(aliasDir);
  }
}

async function handleRemoveAlias(aliasName: string) {
  const userProfile = process.env.USERPROFILE || process.env.HOME || "";
  const aliasDir = path.join(userProfile, "Aliases");
  const aliasPath = path.join(aliasDir, `${aliasName}.bat`);

  if (!fs.existsSync(aliasPath)) {
    console.error(`❌ Alias "${aliasName}" does not exist`);
    process.exit(1);
  }

  fs.unlinkSync(aliasPath);
  console.log(`✅ Removed alias: ${aliasName}`);
}

// ==================== UTILITIES ====================

function execPowerShell(command: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn("powershell", ["-NoProfile", "-Command", command], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let stderr = "";

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (stderr.includes("Path already exists")) {
        console.log("ℹ️  Path already exists in PATH, no changes made.");
        resolve(0);
      } else if (code === 0) {
        resolve(0);
      } else {
        if (stderr) console.error(stderr);
        resolve(code || 1);
      }
    });

    child.on("error", (err) => {
      console.error(`❌ Error executing PowerShell: ${err.message}`);
      resolve(1);
    });
  });
}

async function getUserPath(): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(
      "powershell",
      ["-NoProfile", "-Command", "[Environment]::GetEnvironmentVariable('PATH', 'User')"],
      { stdio: ["pipe", "pipe", "pipe"], windowsHide: true }
    );

    let stdout = "";
    child.stdout.on("data", (data) => (stdout += data.toString()));
    child.on("close", () => resolve(stdout.trim()));
    child.on("error", () => resolve(""));
  });
}

async function addToPath(dir: string) {
  const psScript = `
    $path = [Environment]::GetEnvironmentVariable("PATH", "User")
    $paths = $path -split ';'
    if ($paths -contains "${dir}") {
        Write-Host "Path already exists"
        exit 0
    }
    $newPath = $path + ";${dir}"
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    Write-Host "Successfully added to PATH"
  `;

  return new Promise<number>((resolve) => {
    const child = spawn("powershell", ["-NoProfile", "-Command", psScript], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    child.on("close", (code) => resolve(code || 0));
    child.on("error", () => resolve(1));
  });
}

async function addDirToPath(dir: string) {
  const normalizedPath = dir.replace(/\/$/, "").replace(/\\+$/, "");

  const psScript = `
    $path = [Environment]::GetEnvironmentVariable("PATH", "User")
    $paths = $path -split ';'
    if ($paths -contains "${normalizedPath}") {
        Write-Host "Path already exists"
        exit 0
    }
    $newPath = $path + ";${normalizedPath}"
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    Write-Host "Successfully added to PATH"
  `;

  return new Promise<number>((resolve) => {
    const child = spawn(
      "powershell",
      ["-NoProfile", "-Command", psScript],
      {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      }
    );

    let stderr = "";

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (stderr.includes("Path already exists")) {
        resolve(0);
      } else {
        resolve(code || 0);
      }
    });

    child.on("error", () => {
      resolve(1);
    });
  });
}

async function removeFromPath(dir: string): Promise<boolean> {
  const normalizedPath = dir.replace(/\/$/, "").replace(/\\+$/, "");

  const psScript = `
    $path = [Environment]::GetEnvironmentVariable("PATH", "User")
    $paths = $path -split ';'
    if (-not $paths -contains "${normalizedPath}") {
        Write-Host "Path not found"
        exit 0
    }
    $newPaths = $paths | Where-Object { $_ -ne "${normalizedPath}" }
    $newPath = $newPaths -join ';'
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    Write-Host "Successfully removed from PATH"
  `;

  return new Promise<boolean>((resolve) => {
    const child = spawn(
      "powershell",
      ["-NoProfile", "-Command", psScript],
      {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      }
    );

    let stderr = "";

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (stderr.includes("Path not found")) {
        resolve(false);
      } else {
        resolve(code === 0);
      }
    });

    child.on("error", () => {
      resolve(false);
    });
  });
}

async function getPath(): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(
      "powershell",
      ["-NoProfile", "-Command", "[Environment]::GetEnvironmentVariable('PATH', 'User')"],
      {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      }
    );

    let stdout = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.on("close", () => {
      resolve(stdout.trim());
    });

    child.on("error", () => {
      resolve("");
    });
  });
}

async function ensureAliasDirInPath(userProfile: string, aliasDir: string) {
  const currentPath = await getPath();
  if (currentPath.includes(aliasDir)) {
    return;
  }

  console.log("");
  console.log(`🔧 Adding Aliases directory to PATH...`);

  const psScript = `
    $path = [Environment]::GetEnvironmentVariable("PATH", "User")
    $paths = $path -split ';'
    if ($paths -contains "${aliasDir}") {
        Write-Host "Path already exists"
        exit 0
    }
    $newPath = $path + ";${aliasDir}"
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    Write-Host "Successfully added to PATH"
  `;

  return new Promise<number>((resolve) => {
    const child = spawn(
      "powershell",
      ["-NoProfile", "-Command", psScript],
      {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      }
    );

    let stderr = "";

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ Aliases directory added to PATH!`);
        console.log(`   Please RESTART your terminal to use aliases.`);
      }
      resolve(code || 0);
    });

    child.on("error", () => {
      resolve(1);
    });
  });
}
