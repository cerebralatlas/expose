/**
 * Bun Windows Environment Variable Tool
 * Usage:
 *   bun env-add VAR=value              # Add user-level variable
 *   bun env-add VAR=value --system     # Add system-level variable (requires admin)
 *   bun env-add --path "C:\path\to\dir"  # Add directory to PATH
 *   bun env-add --delete VAR           # Delete environment variable
 *   bun env-add --setup                # Setup PATH for tools and aliases (run once)
 */
import { spawn } from "child_process";
import * as os from "os";
import * as path from "path";

const args = process.argv.slice(2);

if (args.length === 0) {
  showHelp();
  process.exit(0);
}

// Parse options
const isSystem = args.includes("--system");
const isDelete = args.includes("--delete");
const isPath = args.includes("--path");
const prepend = args.includes("--prepend");
const isSetup = args.includes("--setup");

// Filter out options to get the actual argument
const cleanArgs = args.filter((a) => !a.startsWith("--"));
const targetArg = cleanArgs[0];

// --help or no arguments
if (args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

// --setup mode: Configure PATH for tools and aliases
if (isSetup) {
  await handleSetup();
  process.exit(0);
}

// --path mode: Add directory to PATH
if (isPath) {
  if (!targetArg) {
    console.error("❌ Error: Missing path argument");
    console.error("Usage: bun env-add --path \"C:\\path\\to\\dir\"");
    process.exit(1);
  }
  await handlePathMode(targetArg, prepend, isSystem);
  process.exit(0);
}

// --delete mode: Delete environment variable
if (isDelete) {
  if (!targetArg) {
    console.error("❌ Error: Missing variable name");
    console.error("Usage: bun env-add --delete VAR_NAME");
    process.exit(1);
  }
  await handleDeleteMode(targetArg, isSystem);
  process.exit(0);
}

// Normal mode: Set VAR=value
if (!targetArg || !targetArg.includes("=")) {
  console.error("❌ Error: Invalid argument format. Expected VAR=value");
  console.error("Usage: bun env-add VAR=value [--system]");
  process.exit(1);
}

const [name, ...valueParts] = targetArg.split("=");
const value = valueParts.join("=");

if (!name) {
  console.error("❌ Error: Variable name cannot be empty");
  process.exit(1);
}

// Validate variable name (Windows naming rules)
const varNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
if (!varNameRegex.test(name)) {
  console.error(
    "❌ Error: Invalid variable name. Must start with letter or underscore, and contain only letters, numbers, and underscores"
  );
  process.exit(1);
}

await handleSetMode(name, value, isSystem);

function showHelp() {
  console.log(`
🔧 Bun Windows Environment Variable Tool

Usage:
  bun env-add VAR=value              Add user-level variable
  bun env-add VAR=value --system     Add system-level variable (requires admin)
  bun env-add --path "C:\\path"      Add directory to PATH
  bun env-add --delete VAR           Delete environment variable
  bun env-add --setup                Configure PATH for tools (run once)
  bun env-alias name "C:\\path\\to\\exe"  Create command alias

Options:
  --system      Set system-level variable (requires admin)
  --prepend     Add to beginning of PATH
  --help, -h    Show this help message

Examples:
  bun env-add MY_VAR=hello
  bun env-add PATH_VAR=C:\\bin --system
  bun env-add --path "C:\\Users\\John\\bin"
  bun env-add --delete OLD_VAR
  bun env-add --setup
  bun env-alias emailcode "C:\\Users\\John\\code.exe"
`);
}

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

async function handlePathMode(path: string, prepend: boolean, isSystem: boolean) {
  const target = isSystem ? "Machine" : "User";
  const targetLabel = isSystem ? "system" : "user";

  // Normalize path
  const normalizedPath = path.replace(/\/$/, "").replace(/\\+$/, "");

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

async function handleSetup() {
  console.log("🔧 Setting up PATH for env-add and env-alias commands...\n");

  const userProfile = os.homedir();
  const bunBinDir = path.join(userProfile, ".bun", "bin");
  const aliasDir = path.join(userProfile, "Aliases");

  // Get current PATH
  const currentPath = await getUserPath();
  const paths = currentPath.split(";");

  let modified = false;

  // Add .bun\bin if not present
  if (!paths.includes(bunBinDir)) {
    console.log(`📦 Adding .bun\\bin to PATH...`);
    await addToPath(bunBinDir);
    modified = true;
  } else {
    console.log(`ℹ️  .bun\\bin already in PATH`);
  }

  // Add Aliases if not present
  if (!paths.includes(aliasDir)) {
    console.log(`📁 Adding Aliases to PATH...`);
    await addToPath(aliasDir);
    modified = true;
  } else {
    console.log(`ℹ️  Aliases already in PATH`);
  }

  console.log("");
  if (modified) {
    console.log("✅ Setup complete!");
    console.log("");
    console.log("Please RESTART your terminal to use the commands.");
    console.log("");
    console.log("Usage:");
    console.log("  bun-env-add MY_VAR=hello          # Set environment variable");
    console.log("  bun-env-add --path \"C:\\dir\"      # Add to PATH");
    console.log("  bun-env-alias cmd \"C:\\exe\"      # Create alias");
  } else {
    console.log("✅ Already configured! Just restart your terminal.");
  }
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
