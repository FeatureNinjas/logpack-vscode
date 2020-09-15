import * as vscode from 'vscode'
import { LogPack } from './LogPack'

export class LogPackGroup extends vscode.TreeItem {
  contextValue = 'group'

  constructor(
    public readonly label: string,
    public readonly logPacks: LogPack[]
  ) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed)
  }

  push(logPack: LogPack) {
    this.logPacks.push(logPack)
  }
}