import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as ftp from 'basic-ftp'
import { LogPackEntry } from './LogPackEntry'
import { LogPack } from './LogPack'
import { KeyObject } from 'crypto'
import { FtpSink } from './sinks/FtpSink'
import { LogPackGroup } from './LogPackGroup'

enum LogPackExplorerViewMode {
  Flat,
  GroupByReturnCode
}

export class LogPackProvider implements vscode.TreeDataProvider<LogPack | LogPackEntry | LogPackGroup> {

  private viewMode: LogPackExplorerViewMode = LogPackExplorerViewMode.Flat // time, groupByCode
  private downloadDuringLoad: boolean = true
  private data: LogPack[] | undefined = new Array<LogPack>()

  private previousSelection: [LogPack | undefined, Number] = [undefined, 0]

  private _onDidChangeTreeData: vscode.EventEmitter<LogPack | undefined | void> = new vscode.EventEmitter<LogPack | undefined | void>()
  readonly onDidChangeTreeData: vscode.Event<LogPack | undefined | void> = this._onDidChangeTreeData.event

  /**
   * Default constructor
   *
   * @param storagePath The path to where the log packs are stored locally
   */
  constructor(private storagePath: string | undefined) {
    console.log('Hello LogPack')
  }

  // get tree item
  getTreeItem(element: LogPack): vscode.TreeItem {
    return element;
  }

  // get children
  async getChildren(element?: LogPack | LogPackEntry | LogPackGroup): Promise<LogPack[] | LogPackEntry[] | LogPackGroup[]> {

    if (element !== undefined && element instanceof LogPackGroup) {
      return Promise.resolve(element.logPacks)
    }

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
            entries[i]))
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

      // check if all data has to be reloaded from the server
      if (this.downloadDuringLoad) {
        // it is requested to reload the whole list from the sink
        const sink = new FtpSink(this.storagePath)
        const lps = await sink.list()
        this.data = lps
      }

      // now organize the data in the tree accordingly
      if (this.data !== undefined) {

        if (this.viewMode === LogPackExplorerViewMode.Flat) {
          // flat, just as they come from the server, don't do anything
          return Promise.resolve(this.data)

        } else if (this.viewMode === LogPackExplorerViewMode.GroupByReturnCode) {

          const regexGroup = /[0-9]{8}-[0-9]{6}-(\w*)-[\w\W]*/g
          const groups: LogPackGroup[] = new Array<LogPackGroup>()
          for (let i = 0; i < this.data.length; i++) {
            const lp = this.data[i];
            const match = regexGroup.exec(lp.label)
            if (match !== null) {
              const groupName: string = match[1]

              // search for an existing group
              let group: LogPackGroup | null = null
              for (let j = 0; j < groups.length; j++) {
                group = groups[j];
                if (group.label === groupName) {
                  break
                }
                group = null
              }

              // create new group if required
              if (group === null) {
                group = new LogPackGroup(groupName, new Array<LogPack>())
                groups.push(group)
              }

              group.push(lp)
            } else {
              console.log('Could not assign this logpack to a group' + lp)
            }
          }

          return Promise.resolve(groups)
        }
      }

      if (this.data !== undefined) {
      }
    }
    return Promise.resolve([])
  }

  refreshAll() {
    this.data = []
    this.downloadDuringLoad = true
    this._onDidChangeTreeData.fire()
  }

  changeView() {
    this.downloadDuringLoad = false
    if (this.viewMode === LogPackExplorerViewMode.Flat) {
      this.viewMode = LogPackExplorerViewMode.GroupByReturnCode
    } else {
      this.viewMode = LogPackExplorerViewMode.Flat
    }
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
}
