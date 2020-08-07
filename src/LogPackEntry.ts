import * as vscode from 'vscode'
import * as fs from 'fs'

export class LogPackEntry extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly path: fs.PathLike,
    public readonly file: fs.Dirent
  ) {
    super(label,
      file.isDirectory() ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None)

    if (file.isFile()) {
      this.command = {
        command: 'logpack.selectLogPackEntry',
        title: 'select logpack entry',
        arguments: [this]
      }
    }
  }

  get localPath(): fs.PathLike {
    return this.path
  }
}
