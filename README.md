# Focused Explorer Lite 0.3.4

A separate VS Code explorer that keeps your complete Unity workspace (and C# tooling) open.

## Install

In VS Code, open Extensions (`Ctrl+Shift+X`), open the `...` menu and choose **Install from VSIX...**. Select `focused-explorer-lite-0.3.4.vsix`. If you already installed version 0.1.0, install this file over it and reload the window if necessary.

## Focus and navigate

- Right-click a folder in the normal VS Code Explorer and choose **Focus in Focused Explorer Lite**.
- Right-click a folder within the custom view and select **Focus on Folder**, or use the target icon next to the folder.
- The title buttons go up, reset to the workspace roots, refresh, open settings, and create a file/folder.
- Click a file to edit it normally in VS Code.

## Hide files and folders

Press `Ctrl+,`, search for `Focused Explorer Lite: Hide`, and edit the list with **Add Item** / remove item controls. The default list is:

- `*.meta`
- `.git`
- `node_modules`

Individual names or patterns like `*.meta`, `*.json`, `**/Library` are supported. The filter applies only to Focused Explorer Lite; it never deletes files or changes Unity compilation. `Focused Explorer Lite: Show Hidden` additionally controls dotfiles.

## Context menu

Right-click an item in Focused Explorer Lite:

- **Focus on Folder** — focus the selected folder (only for folders); the target icon next to the folder still works.

- **New File...** — create a new, empty file in the selected folder (or next to the selected file). Enter the full filename, for example `MyPacket.cs`. Automatically opens the new file.
- **New Folder...** — create a folder in the selected folder (or next to the selected file).
- **Reveal in File Explorer** — opens the operating-system file explorer.
- **Rename...** — rename a file or folder, including changing the file extension if desired.
- **Delete...** — asks for confirmation, then moves the selected file or folder to the trash/recycle bin.

Use the two new-file/new-folder buttons at the top of the view to create in the focused directory. With no focused directory and several workspace roots, a picker selects the destination.

## Limitations

This is a minimal custom explorer, not a complete clone of the built-in VS Code Explorer. It does not yet offer drag/drop, clipboard operations, file decorations, or native undo for custom rename/delete actions. Deletion requires a supported recycle bin/trash. For safe operation, the extension does not overwrite existing files or directories.

## Version 0.3.4

- Displays `Focus: <folder name>` as a separate line immediately above the file list, rather than beside the view title. Only the folder name appears, not its full path. The line disappears when viewing workspace roots.
- Adds **Focus on Folder** to folder context menus while preserving the target icon beside folder rows.
- Includes an AI-generation disclosure in the extension metadata and this README.

## About

**AI-generated:** The source code and initial packaging of this extension were generated with OpenAI ChatGPT at the user's request. Functionality should be reviewed and tested in VS Code before wider distribution.

**API limitation:** A blank-area right-click context menu is not supported in VS Code custom Tree Views. Use the toolbar buttons to create when nothing is selected.

