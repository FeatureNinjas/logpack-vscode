import { Sink } from './Sink';
import { LogPack } from '../LogPack'
import * as vscode from 'vscode'
import * as ftp from 'basic-ftp'

export class FtpSink extends Sink {
  constructor(protected storagePath: string | undefined) {
    super(storagePath)
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