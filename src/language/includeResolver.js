"use strict";

const fs = require("fs");
const path = require("path");

const COMMON_INCLUDE_FOLDERS = ["include", "includes", path.join("asm", "include"), path.join("interface", "Asm")];

class IncludeResolver {
  constructor(options = {}) {
    this.vscode = options.vscode;
  }

  resolve(includeName, fromFile) {
    if (!includeName || isSpecialNasmInclude(includeName)) {
      return null;
    }

    const candidates = [];
    const fileDirname = fromFile ? path.dirname(fromFile) : "";
    if (fromFile) {
      candidates.push(path.resolve(fileDirname, includeName));
    }

    for (const folder of this.workspaceFolders()) {
      candidates.push(path.resolve(folder, includeName));
    }

    for (const includePath of this.includePaths(fileDirname)) {
      candidates.push(path.resolve(includePath, includeName));
    }

    for (const folder of this.commonIncludeFolders()) {
      candidates.push(path.resolve(folder, includeName));
    }

    return dedupe(candidates).find((candidate) => {
      try {
        return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
      } catch (_error) {
        return false;
      }
    }) || null;
  }

  includePaths(fileDirname = "") {
    const configured = this.configurationIncludePaths();
    const folders = this.workspaceFolders();
    const expanded = [];

    for (const entry of configured) {
      if (typeof entry !== "string" || entry.trim() === "") {
        continue;
      }

      const withFileDirname = entry.replace(/\$\{fileDirname\}/g, fileDirname);

      if (withFileDirname.includes("${workspaceFolder}")) {
        for (const folder of folders) {
          expanded.push(withFileDirname.replace(/\$\{workspaceFolder\}/g, folder));
        }
      } else if (path.isAbsolute(withFileDirname)) {
        expanded.push(withFileDirname);
      } else if (fileDirname) {
        expanded.push(path.resolve(fileDirname, withFileDirname));
      } else {
        for (const folder of folders) {
          expanded.push(path.resolve(folder, withFileDirname));
        }
      }
    }

    return dedupe(expanded);
  }

  configurationIncludePaths() {
    const workspace = this.vscode && this.vscode.workspace;
    if (!workspace || typeof workspace.getConfiguration !== "function") {
      return [];
    }

    const value = workspace.getConfiguration("mjAsmHighlighter").get("includePaths", []);
    return Array.isArray(value) ? value : [];
  }

  workspaceFolders() {
    const workspace = this.vscode && this.vscode.workspace;
    if (!workspace || !Array.isArray(workspace.workspaceFolders)) {
      return [];
    }

    return workspace.workspaceFolders
      .map((folder) => folder && folder.uri && folder.uri.fsPath)
      .filter(Boolean);
  }

  commonIncludeFolders() {
    const folders = [];
    for (const root of this.workspaceFolders()) {
      for (const relativeFolder of COMMON_INCLUDE_FOLDERS) {
        const candidate = path.resolve(root, relativeFolder);
        try {
          if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
            folders.push(candidate);
          }
        } catch (_error) {
          // Ignore folders that cannot be inspected.
        }
      }
    }
    return dedupe(folders);
  }
}

function isSpecialNasmInclude(includeName) {
  return /^%[!?]/.test(includeName) || /^[A-Za-z]+:$/.test(includeName);
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean).map((value) => path.resolve(value)))];
}

module.exports = {
  IncludeResolver,
  COMMON_INCLUDE_FOLDERS
};
