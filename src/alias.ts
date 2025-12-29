/**
 * Bun Windows Alias Tool
 * Usage:
 *   bun env-alias name "C:\\path\\to\\exe"           # Create simple alias
 *   bun env-alias name "C:\\path\\to\\exe" --args "arg1 arg2"  # With default args
 *   bun env-alias name "C:\\path\\to\\exe" --path            # Also add directory to PATH
 */
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

// Parse options
const shouldAddToPath = args.includes("--path");
const withArgs = args.find((a) => a.startsWith("--args="))?.replace("--args=", "");
const remove = args.includes("--remove");
const listAliases = args.includes("--list") || args.includes("-l");

// Filter out options
const cleanArgs = args.filter((a) => !a.startsWith("--"));
const aliasName = cleanArgs[0];
const targetExe = cleanArgs[1];

if (remove) {
  // Remove alias mode
  if (!aliasName) {
    console.error("❌ Error: Missing alias name");
    console.error("Usage: bun env-alias --remove aliasname");
    process.exit(1);
  }
  await handleRemoveAlias(aliasName);
} else if (listAliases) {
  // List aliases mode
  await handleListAliases();
} else {
  // Create alias mode
  if (!aliasName || !targetExe) {
    console.error("❌ Error: Missing alias name or executable path");
    console.error("Usage: bun env-alias name \"C:\\path\\to\\exe\" [--path]");
    process.exit(1);
  }

  // Validate alias name (Windows filename rules)
  const aliasRegex = /^[a-zA-Z_][a-zA-Z0-9_\-\.]*$/;
  if (!aliasRegex.test(aliasName)) {
    console.error(
      "❌ Error: Invalid alias name. Must contain only letters, numbers, hyphens, underscores, and dots"
    );
    process.exit(1);
  }

  await handleCreateAlias(aliasName, targetExe, withArgs, shouldAddToPath);
}

function showHelp() {
  console.log(`
📝 Bun Windows Alias Tool

Usage:
  bun env-alias name "C:\\path\\to\\exe"         Create command alias
  bun env-alias name "C:\\path\\to\\exe" --path  Also add exe dir to PATH
  bun env-alias --list                          List all aliases
  bun env-alias --remove name                   Remove alias
  bun env-alias --help                          Show this help

Examples:
  bun env-alias emailcode "C:\\Users\\John\\code.exe"
  bun env-alias serve "C:\\Users\\John\\serve.exe" --path
  bun env-alias --list
  bun env-alias --remove emailcode

Note: Aliases are stored in %USERPROFILE%\\Aliases directory
`);
}

async function handleListAliases() {
  const userProfile = process.env.USERPROFILE || process.env.HOME || "";
  const aliasDir = path.join(userProfile, "Aliases");

  if (!fs.existsSync(aliasDir)) {
    console.log("📋 No aliases found. Use 'bun env-alias name \"path\\to\\exe\"' to create one.");
    return;
  }

  const files = fs.readdirSync(aliasDir).filter((f) => f.endsWith(".bat"));

  if (files.length === 0) {
    console.log("📋 No aliases found. Use 'bun env-alias name \"path\\to\\exe\"' to create one.");
    return;
  }

  console.log("📋 Configured Aliases:\n");

  for (const file of files) {
    const aliasName = file.replace(".bat", "");
    const aliasPath = path.join(aliasDir, file);
    const content = fs.readFileSync(aliasPath, "utf8");

    // Extract target exe from bat content
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
  // Get user profile directory
  const userProfile = process.env.USERPROFILE || process.env.HOME || "";
  const aliasDir = path.join(userProfile, "Aliases");

  // Create Aliases directory if it doesn't exist
  if (!fs.existsSync(aliasDir)) {
    fs.mkdirSync(aliasDir, { recursive: true });
    console.log(`🔧 Created Aliases directory: ${aliasDir}`);
  }

  // Check if alias already exists
  const aliasPath = path.join(aliasDir, `${aliasName}.bat`);
  if (fs.existsSync(aliasPath)) {
    console.log(`⚠️  Alias "${aliasName}" already exists. Use --remove to delete it first.`);
    process.exit(1);
  }

  // Add the directory containing the exe to PATH if requested
  if (shouldAddToPath) {
    const exeDir = path.dirname(targetExe);
    console.log(`🔧 Adding executable directory to PATH: ${exeDir}`);
    await addDirToPath(exeDir);
  }

  // Create the .bat file
  const escapedExe = targetExe.replace(/"/g, '`"');
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

  // Auto-add Aliases directory to PATH if not already present
  await ensureAliasDirInPath(userProfile, aliasDir);

  console.log(`✅ Created alias: ${aliasName}`);
  console.log(`   Points to: ${targetExe}`);
  if (defaultArgs) {
    console.log(`   Default args: ${defaultArgs}`);
  }
  console.log(`   Location: ${aliasPath}`);
  console.log("");
  console.log("ℹ️  Note: Close and reopen your terminal to use the new alias.");

  // Check if Aliases is in PATH
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
    return; // Already in PATH
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
