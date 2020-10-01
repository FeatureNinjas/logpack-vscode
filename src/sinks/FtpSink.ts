import { Sink } from './Sink';
import { LogPack } from '../LogPack'
import * as vscode from 'vscode'
import * as ftp from 'basic-ftp'
import { Client } from 'basic-ftp';

export class FtpSink extends Sink {

  private client: Client

  constructor(protected storagePath: string | undefined) {
    super(storagePath)

    this.client = new ftp.Client()
  }

  private async ensureConnection() {

    // check if the client is closed, then reopen it
    if (this.client.closed) {
      const config = vscode.workspace.getConfiguration('logPack')
      const ftpServer: string | undefined = config.get('ftp.server')
      if (ftpServer === '') {
        vscode.window.showErrorMessage('No FTP server specified for LogPack')
        return Promise.resolve([])
      }
      const ftpUsername: string | undefined = config.get('ftp.user')
      const ftpPassword: string | undefined = config.get('ftp.password')

      await this.client.access({
        host: ftpServer,
        user: ftpUsername,
        password: ftpPassword
      });
    }
  }

  async delete(lps: LogPack[], progress: (i: number) => void) {
    await this.ensureConnection()
    for (let i = 0; i < lps.length; i++) {
      try {
        const lp = lps[i]
        await this.client.remove(lp.fileInfo.name)
        progress(i)
        console.log("progress: " + i)
      } catch (error) {
        console.error(error);
      }
    }
  }

  async deleteSingle(lp: LogPack) {
    await this.ensureConnection()
    await this.client.remove(lp.fileInfo.name)
  }

  async list(): Promise<LogPack[] | undefined> {
    const config = vscode.workspace.getConfiguration('logPack')
    const ftpServer: string | undefined = config.get('ftp.server')
    if (ftpServer === '') {
      vscode.window.showErrorMessage('No FTP server specified for LogPack')
      return []
    }
    const ftpUsername: string | undefined = config.get('ftp.user')
    const ftpPassword: string | undefined = config.get('ftp.password')

    console.log('Reloading tree')

    const client = new ftp.Client()

    try {
      await client.access({
        host: ftpServer,
        user: ftpUsername,
        password: ftpPassword
      })
      const files = await client.list()
      const logpacks: LogPack[] = new Array()
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.name.startsWith('logpack') && file.name.endsWith('.zip') && file.isFile) {
          const name = file.name.substr(
            file.name.indexOf('-') + 1,
            file.name.length - (file.name.indexOf('-') + 1) - '.zip'.length)
          const size = this.formatBytes(file.size)
          const logpack = new LogPack(name, file, this.storagePath?.toString(), size, vscode.TreeItemCollapsibleState.None)
          logpacks.push(logpack)
        }
        if (file.name.endsWith('.logpack') && file.isFile) {
          const name = file.name.substr(
            file.name.indexOf('-') + 1,
            file.name.length - (file.name.indexOf('-') + 1) - '.logpack'.length)
          const size = this.formatBytes(file.size)
          const logpack = new LogPack(name, file, this.storagePath?.toString(), size, vscode.TreeItemCollapsibleState.None)
          logpacks.push(logpack)
        }
      }
      return logpacks
    } catch (error) {
      vscode.window.showErrorMessage(`LogPack: ${error}`)
      console.error(error)
    }
  }
}