# Focused Explorer Lite v0.3.7

A lightweight, separate file explorer for Visual Studio Code. Focus on the folder you are working in while keeping your **full workspace and C# project tooling** open. Particularly useful for Unity projects.

> **AI disclosure:** This extension was generated with assistance from OpenAI ChatGPT. Review and test the code before production use.

## Installation

1. Download `focused-explorer-lite-0.3.7.vsix` from the GitHub release assets.
2. In VS Code, open **Extensions** (`Ctrl+Shift+X`).
3. Open the `...` menu and select **Install from VSIX...**.
4. Choose the VSIX and reload the editor if prompted.

The extension does **not** replace or reopen your Unity workspace. It provides an additional view in the standard VS Code Explorer sidebar.

## Focus and navigation

- Right-click a folder in the standard Explorer and choose **Focus in Focused Explorer Lite**.
- In the custom explorer, right-click a folder and choose **Focus on Folder**, or use the target icon beside its name.
- The toolbar offers **Go to Parent Folder**, **Show Workspace Roots**, **Refresh**, **Configure Hidden Files**, **New File**, and **New Folder**.
- When a folder is focused, `Focus: <folder name>` is displayed **above the file list**; only the folder name is shown, not the full path.
- Click a file to open it in the normal VS Code editor.

## Exclude files and folders

Open VS Code settings with `Ctrl+,` and search for **Focused Explorer Lite: Hide**. The editable list supports individual names and glob-style patterns:

| Pattern | Effect |
| --- | --- |
| `*.meta` | Hide Unity `.meta` files |
| `Packet.cs` | Hide files with that exact name |
| `.git` | Hide folders named `.git` |
| `node_modules` | Hide folders named `node_modules` |
| `**/*.json` | Hide matching JSON files by workspace-relative path |

Defaults: `*.meta`, `.git`, `node_modules`. The optional **Show Hidden** setting controls dotfiles. Exclusions only affect the custom explorer view: files remain on disk and in your Unity/C# project.

## File management

Right-click a file or folder to access the supported operations:

- **New File...** — enter a filename *including its extension*, for example `RequestPacket.cs`. A new empty file is opened automatically.
- **New Folder...** — enter a folder name.
- **Rename...** — rename a file or folder.
- **Delete...** — confirm and move the file or folder to the operating system's recycle bin/trash.
- **Reveal in File Explorer** — show the item in your operating system's file manager.
- **Focus on Folder** — available for folders; the target icon remains as a shortcut.

The **New File** and **New Folder** toolbar buttons create in the current focused directory. If no folder is focused and multiple workspace roots exist, you can choose a destination.

## Changes in v0.3.7 (based on v0.3.4)

- New files are created with `vscode.WorkspaceEdit.createFile()` and `vscode.workspace.applyEdit()` rather than `vscode.workspace.fs.writeFile()`. This follows the standard VS Code workspace edit pipeline and allows participating extensions to receive file creation notifications.
- Newly created files still open automatically.
- Rewrote and corrected the README to match the actual v0.3.4 feature set and the new file-creation behavior.
- Removed the outdated MIT declaration from package metadata; see Licensing below.

**Unity / IntelliSense caveat:** Using `WorkspaceEdit` should improve integration with VS Code extensions, but **it cannot guarantee immediate Unity import or `.csproj` regeneration**. If a new `.cs` file is not recognized, use **Unity → Assets → Refresh** or regenerate project files in Unity's External Tools preferences. The C# language server also needs a valid project/solution.

## Limitations

- This is a custom tree view, not a replacement for every native Explorer feature. It does not implement file drag-and-drop or clipboard operations.
- VS Code's custom Tree View API does not expose a context menu on empty view space; use the toolbar buttons to create files or folders when nothing is selected.
- Directory creation, rename, and deletion currently use `vscode.workspace.fs` rather than the native Explorer's complete file-operation pipeline.
- New names cannot overwrite existing items. Deletion requires recycle bin/trash support.

## Licensing

This package is currently marked **UNLICENSED**. An earlier release included MIT-licensed metadata; removing it from a later version does not revoke rights previously granted under MIT. If you want to explicitly permit private use and modification but prohibit redistribution, add a carefully reviewed custom license before further public distribution. GitHub public-repository terms may independently permit viewing and forking on GitHub.
