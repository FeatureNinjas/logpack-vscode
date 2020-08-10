import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as ftp from 'basic-ftp'
import { LogPackEntry } from './LogPackEntry'
import { LogPack } from './LogPack'
import { KeyObject } from 'crypto'

export class LogPackProvider implements vscode.TreeDataProvider<LogPack | LogPackEntry> {

  private previousSelection: [LogPack | undefined, Number] = [undefined, 0]

  private _onDidChangeTreeData: vscode.EventEmitter<LogPack | undefined | void> = new vscode.EventEmitter<LogPack | undefined | void>()
  readonly onDidChangeTreeData: vscode.Event<LogPack | undefined | void> = this._onDidChangeTreeData.event

  // constructor
  constructor(private storagePath: string | undefined) {
    console.log('Hello LogPack')
  }

  // get tree item
  getTreeItem(element: LogPack): vscode.TreeItem {
    return element;
  }

  // get children
  async getChildren(element?: LogPack | LogPackEntry): Promise<LogPack[] | LogPackEntry[]> {

    if (element !== undefined && element instanceof LogPack) {
      console.log('Loading logpack element')

      const logPackEntries: LogPackEntry[] = new Array<LogPackEntry>()
      if (fs.existsSync(element.localPath)) {
        const entries = fs.readdirSync(element.localPath, { withFileTypes: true })
        console.log(entries)
        console.log(entries.length)
        for (let i = 0; i < entries.length; i++) {
          console.log(`element ${i}`)
          console.log(entries[i])
          logPackEntries.push(new LogPackEntry(
            entries[i].name,
            path.join(element.localPath.toString(), entries[i].name),
            entries[i]
          ))
        }
      }
      console.log(logPackEntries.length)
      return Promise.resolve(logPackEntries)
    }
    else if (element !== undefined && element instanceof LogPackEntry) {
      console.log('Loading logpack entry')

      const logPackEntries: LogPackEntry[] = new Array<LogPackEntry>()
      if (element.file.isDirectory()) {
        const entries = fs.readdirSync(element.localPath, { withFileTypes: true })
        console.log(entries)
        console.log(entries.length)
        for (let i = 0; i < entries.length; i++) {
          console.log(`element ${i}`)
          console.log(entries[i])
          logPackEntries.push(new LogPackEntry(
            entries[i].name,
            path.join(element.path.toString(), entries[i].name),
            entries[i]
          ))
        }
      }
      console.log(logPackEntries.length)
      return Promise.resolve(logPackEntries)
    }
    else if (element === undefined) {
      console.log('Reloading tree')

      const client = new ftp.Client()

      try {
        await client.access({
          host: 'waws-prod-db3-139.ftp.azurewebsites.windows.net',
          user: 'lp-test-storage\\$lp-test-storage',
          password: 'yQGWZ2mRCcezEqKEgR2kYrjlceJimhg6nj5c41PQwHige6hrcX1kehin2LYb'
        })
        const files = await client.list()
        const logpacks: LogPack[] = new Array()
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          if (file.name.startsWith('logpack') && file.isFile) {
            const name = file.name.substr(
              file.name.indexOf('-') + 1,
              file.name.length - (file.name.indexOf('-') + 1) - '.zip'.length)
            const size = this.formatBytes(file.size)
            const logpack = new LogPack(name, file, this.storagePath?.toString(), size, vscode.TreeItemCollapsibleState.None)
            logpacks.push(logpack)
          }
        }
        return Promise.resolve(logpacks)
      } catch (error) {
        console.error(error)
      }
    }
    return Promise.resolve([])
  }

  refreshAll() {
    this._onDidChangeTreeData.fire()
  }

  async download(lp: LogPack): Promise<any> {
    console.log(`Downloading ${lp.fileInfo.name}`)
    if (this.storagePath === undefined) {
      vscode.window.showInformationMessage('No workspace loaded')
    } else {
      await lp.download()
      this._onDidChangeTreeData.fire(lp)
    }
  }

  async remove(lp: LogPack, lps: LogPack[]): Promise<any> {
    if (lps !== undefined) {
      // multiple selected for deletion
      console.log(`About to remove ${lps.length} logpacks`)
      for (let i = 0; i < lps.length; i++) {
        console.log(`Removing on local ${lps[i].fileInfo.name}`)
        await lps[i].remove();
      }
    }
    else {
      // only one selected
      console.log(`Removing on local ${lp.fileInfo.name}`)
      await lp.remove()
    }
    this._onDidChangeTreeData.fire(lp)
  }

  async delete(lp: LogPack, lps: LogPack[]): Promise<any> {
    if (lps !== undefined) {
      // multiple selected for deletion
      console.log(`About to delete ${lps.length} logpacks`)

      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'LogPack',
        cancellable: false
      }, async (progress) => {
        for (let i = 0; i < lps.length; i++) {
          console.log(`Deleting on local and remote ${lps[i].fileInfo.name}`)
          await lps[i].delete();
          progress.report({
            message: `Deleted ${i + 1} of ${lps.length} LogPacks`,
            increment: (1 / lps.length) * 100
          })
        }
        this._onDidChangeTreeData.fire()
        return new Promise(resolve => {
          setTimeout(() => { resolve() }, 3000)
        })
      })
    }
    else {
      // only one selected
      console.log(`Deleting on local and remote ${lp.fileInfo.name}`)
      await lp.delete()
      this._onDidChangeTreeData.fire()
    }
  }

  async doubleClick(lp: LogPack): Promise<any> {
    console.log(this.previousSelection)
    console.log(Date.now())
    if (this.previousSelection !== undefined &&
      this.previousSelection[0] !== undefined &&
      this.previousSelection[0] === lp &&
      this.previousSelection[1] > Date.now() - 500) {
        // last selected entry was the same and it was clicked twice within the past 500ms -> double click
        console.log('download package')
        this.previousSelection = [undefined, 0]
        await this.download(lp)
      }
    else {
      console.log('package selected')
    }
    this.previousSelection = [lp, Date.now()]
  }

  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
