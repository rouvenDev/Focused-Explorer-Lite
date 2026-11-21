'use strict';

const vscode = require('vscode');
const path = require('path');

function globRegex(pattern) {
  const p = pattern.replace(/\\/g, '/');
  let out = '^';
  for (let i = 0; i < p.length; i++) {
    const ch = p[i];
    if (ch === '*') {
      if (p[i + 1] === '*') {
        i++;
        if (p[i + 1] === '/') { i++; out += '(?:.*/)?'; }
        else out += '.*';
      } else out += '[^/]*';
    } else if (ch === '?') out += '[^/]';
    else if (ch === '/') out += '/';
    else out += ch.replace(/[|\\{}()[\]^$+.]/g, '\\$&');
  }
  return new RegExp(out + '$', 'i');
}

function descendantOrSame(parent, candidate) {
  const a = parent.path.replace(/\/$/, '') + '/';
  const b = candidate.path.replace(/\/$/, '') + '/';
  return parent.scheme === candidate.scheme && parent.authority === candidate.authority &&
    b.toLowerCase().startsWith(a.toLowerCase());
}

function parentUri(uri) { return uri.with({ path: path.posix.dirname(uri.path) }); }

class ExplorerProvider {
  constructor(context) {
    this.context = context;
    this.emitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.emitter.event;
    this.focus = undefined;
    this.view = undefined;
    this.refreshHandle = undefined;
    const saved = context.workspaceState.get('focusedExplorerLite.focus');
    if (saved) {
      try {
        const uri = vscode.Uri.parse(saved);
        if (this.isWithinWorkspace(uri)) this.focus = uri;
      } catch (_) { /* Obsolete saved URI */ }
    }
  }

  get workspaces() { return vscode.workspace.workspaceFolders || []; }
  isWithinWorkspace(uri) { return this.workspaces.some(w => descendantOrSame(w.uri, uri)); }
  get workspaceForFocus() { return this.focus && this.workspaces.find(w => descendantOrSame(w.uri, this.focus)); }

  setFocus(uri) {
    if (!uri || !this.isWithinWorkspace(uri)) {
      vscode.window.showWarningMessage('Bitte einen Ordner im aktuellen VS-Code-Workspace auswählen.');
      return;
    }
    this.focus = uri;
    void this.context.workspaceState.update('focusedExplorerLite.focus', uri.toString());
    this.updateTitle();
    this.refresh();
  }

  up() {
    if (!this.focus) return;
    const workspace = this.workspaceForFocus;
    if (!workspace || this.focus.toString() === workspace.uri.toString()) return this.reset();
    const parent = parentUri(this.focus);
    this.setFocus(descendantOrSame(workspace.uri, parent) ? parent : workspace.uri);
  }

  reset() {
    this.focus = undefined;
    void this.context.workspaceState.update('focusedExplorerLite.focus', undefined);
    this.updateTitle();
    this.refresh();
  }

  updateTitle() {
    if (this.view) {
      this.view.description = undefined;
      this.view.message = this.focus ? `Focus: ${path.posix.basename(this.focus.path.replace(/\/+$/, ''))}` : undefined;
    }
  }

  refresh() { this.emitter.fire(undefined); }
  delayedRefresh() {
    if (this.refreshHandle) clearTimeout(this.refreshHandle);
    this.refreshHandle = setTimeout(() => { this.refreshHandle = undefined; this.refresh(); }, 180);
  }

  shouldHide(uri) {
    const config = vscode.workspace.getConfiguration('focusedExplorerLite');
    const rel = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
    const name = path.posix.basename(uri.path);
    if (!config.get('showHidden', true) && name.startsWith('.')) return true;
    return config.get('hide', []).some(raw => {
      if (typeof raw !== 'string' || !raw.trim()) return false;
      const pat = raw.trim();
      try {
        const rex = globRegex(pat);
        return pat.includes('/') ? rex.test(rel) : rex.test(name);
      } catch (_) { return false; }
    });
  }

  getTreeItem(node) {
    const folder = (node.type & vscode.FileType.Directory) !== 0;
    const item = new vscode.TreeItem(node.uri, folder ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    item.label = node.label || path.posix.basename(node.uri.path);
    item.resourceUri = node.uri;
    item.contextValue = folder ? 'folder' : 'file';
    item.tooltip = node.uri.fsPath;
    if (!folder) item.command = { command: 'vscode.open', title: 'Open File', arguments: [node.uri] };
    return item;
  }

  async getChildren(node) {
    if (!node && !this.focus) {
      return this.workspaces.map(w => ({ uri: w.uri, label: w.name, type: vscode.FileType.Directory }));
    }
    const uri = node ? node.uri : this.focus;
    try {
      const entries = await vscode.workspace.fs.readDirectory(uri);
      const children = entries.map(([name, type]) => ({ uri: vscode.Uri.joinPath(uri, name), label: name, type }))
        .filter(item => !this.shouldHide(item.uri))
        .sort((a, b) => {
          const af = (a.type & vscode.FileType.Directory) !== 0;
          const bf = (b.type & vscode.FileType.Directory) !== 0;
          return af === bf ? a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }) : af ? -1 : 1;
        });
      return children;
    } catch (err) {
      if (!node && this.focus) this.reset();
      return [];
    }
  }

  getParent(node) {
    const uri = node.uri;
    if (this.focus && uri.toString() === this.focus.toString()) return undefined;
    const parent = parentUri(uri);
    if (this.focus && !descendantOrSame(this.focus, parent)) return undefined;
    if (!this.focus && this.workspaces.some(w => w.uri.toString() === uri.toString())) return undefined;
    return { uri: parent, type: vscode.FileType.Directory };
  }

  dispose() {
    if (this.refreshHandle) clearTimeout(this.refreshHandle);
    this.emitter.dispose();
  }
}

function uriFromItem(arg) {
  return arg instanceof vscode.Uri ? arg : arg && arg.uri instanceof vscode.Uri ? arg.uri : undefined;
}

function validName(value) {
  if (!value || !value.trim()) return 'Bitte einen Namen eingeben.';
  if (value === '.' || value === '..' || value.includes('/') || value.includes('\\')) return 'Nur einen Dateinamen angeben, keinen Pfad.';
  if (/[<>:"|?*\x00-\x1f]/.test(value)) return 'Der Name enthält ungültige Zeichen.';
  if (/[. ]$/.test(value)) return 'Der Name darf nicht mit einem Punkt oder Leerzeichen enden.';
  return undefined;
}

async function exists(uri) {
  try { await vscode.workspace.fs.stat(uri); return true; }
  catch (e) { if (e instanceof vscode.FileSystemError && e.code === 'FileNotFound') return false; throw e; }
}

async function chooseFolder(provider, arg) {
  const target = uriFromItem(arg);
  if (target) {
    const stat = await vscode.workspace.fs.stat(target);
    return stat.type & vscode.FileType.Directory ? target : parentUri(target);
  }
  if (provider.focus) return provider.focus;
  if (provider.workspaces.length === 1) return provider.workspaces[0].uri;
  const choice = await vscode.window.showQuickPick(provider.workspaces.map(w => ({ label: w.name, description: w.uri.fsPath, uri: w.uri })), { placeHolder: 'Zielordner auswählen' });
  return choice && choice.uri;
}

async function create(provider, arg, folder) {
  const destination = await chooseFolder(provider, arg);
  if (!destination) return;
  const name = await vscode.window.showInputBox({
    title: folder ? 'Neuen Ordner erstellen' : 'Neue Datei erstellen',
    prompt: folder ? 'Ordnername' : 'Dateiname inklusive Endung (z. B. Packet.cs)',
    placeHolder: folder ? 'NeuerOrdner' : 'NeueDatei.cs',
    validateInput: validName
  });
  if (name === undefined) return;
  const uri = vscode.Uri.joinPath(destination, name);
  try {
    if (await exists(uri)) return void vscode.window.showWarningMessage(`Existiert bereits: ${name}`);
    if (folder) await vscode.workspace.fs.createDirectory(uri);
    else await vscode.workspace.fs.writeFile(uri, new Uint8Array());
    provider.refresh();
    if (!folder) await vscode.window.showTextDocument(uri);
  } catch (err) { vscode.window.showErrorMessage(`Erstellen fehlgeschlagen: ${err.message}`); }
}

async function rename(provider, arg) {
  const uri = uriFromItem(arg);
  if (!uri) return;
  const current = path.posix.basename(uri.path);
  const name = await vscode.window.showInputBox({ title: 'Umbenennen', value: current, valueSelection: [0, current.lastIndexOf('.') > 0 ? current.lastIndexOf('.') : current.length], validateInput: validName });
  if (name === undefined || name === current) return;
  const destination = vscode.Uri.joinPath(parentUri(uri), name);
  try {
    if (await exists(destination)) return void vscode.window.showWarningMessage(`Existiert bereits: ${name}`);
    await vscode.workspace.fs.rename(uri, destination, { overwrite: false });
    if (provider.focus && descendantOrSame(uri, provider.focus)) {
      provider.setFocus(destination.with({ path: provider.focus.path.replace(uri.path, destination.path) }));
    }
    provider.refresh();
  } catch (err) { vscode.window.showErrorMessage(`Umbenennen fehlgeschlagen: ${err.message}`); }
}

async function remove(provider, arg) {
  const uri = uriFromItem(arg);
  if (!uri) return;
  const name = path.posix.basename(uri.path);
  const stat = await vscode.workspace.fs.stat(uri);
  const folder = (stat.type & vscode.FileType.Directory) !== 0;
  const choice = await vscode.window.showWarningMessage(
    `${folder ? 'Ordner inklusive Inhalt' : 'Datei'} „${name}“ in den Papierkorb verschieben?`,
    { modal: true }, 'In Papierkorb verschieben'
  );
  if (choice !== 'In Papierkorb verschieben') return;
  try {
    await vscode.workspace.fs.delete(uri, { recursive: folder, useTrash: true });
    if (provider.focus && descendantOrSame(uri, provider.focus)) provider.reset();
    provider.refresh();
  } catch (err) { vscode.window.showErrorMessage(`Löschen fehlgeschlagen: ${err.message}`); }
}

function activate(context) {
  const provider = new ExplorerProvider(context);
  const view = vscode.window.createTreeView('focusedExplorerLite.view', { treeDataProvider: provider, showCollapseAll: true });
  provider.view = view;
  provider.updateTitle();
  context.subscriptions.push(provider, view);

  function command(name, handler) {
    context.subscriptions.push(vscode.commands.registerCommand('focusedExplorerLite.' + name, handler));
  }
  command('focus', async arg => {
    const uri = uriFromItem(arg);
    if (uri) {
      const stat = await vscode.workspace.fs.stat(uri);
      provider.setFocus(stat.type & vscode.FileType.Directory ? uri : parentUri(uri));
      await vscode.commands.executeCommand('focusedExplorerLite.view.focus');
    } else {
      const selected = await chooseFolder(provider);
      if (selected) provider.setFocus(selected);
    }
  });
  command('focusContext', arg => vscode.commands.executeCommand('focusedExplorerLite.focus', arg));
  command('up', () => provider.up());
  command('reset', () => provider.reset());
  command('refresh', () => provider.refresh());
  command('settings', () => vscode.commands.executeCommand('workbench.action.openSettings', '@ext:localtools.focused-explorer-lite'));
  command('createFile', arg => create(provider, arg, false));
  command('createFolder', arg => create(provider, arg, true));
  command('rename', arg => rename(provider, arg));
  command('delete', arg => remove(provider, arg));
  command('showInOS', async arg => {
    const uri = uriFromItem(arg);
    if (uri) await vscode.commands.executeCommand('revealFileInOS', uri);
  });

  const watcher = vscode.workspace.createFileSystemWatcher('**/*');
  context.subscriptions.push(watcher);
  context.subscriptions.push(watcher.onDidChange(() => provider.delayedRefresh()));
  context.subscriptions.push(watcher.onDidCreate(() => provider.delayedRefresh()));
  context.subscriptions.push(watcher.onDidDelete(() => provider.delayedRefresh()));
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('focusedExplorerLite')) provider.refresh();
  }));
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
    if (provider.focus && !provider.isWithinWorkspace(provider.focus)) provider.reset();
    else provider.refresh();
  }));
}

function deactivate() {}
module.exports = { activate, deactivate };
