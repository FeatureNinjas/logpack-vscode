import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as ftp from 'basic-ftp';
import { FileInfo } from 'basic-ftp';
const AdmZip = require('adm-zip');
const afs = fs.promises;

export class LogPack extends vscode.TreeItem {
  isDownloaded: boolean = false

  constructor(
    public readonly label: string,
    public readonly fileInfo: FileInfo,
    public readonly storagePath: string | undefined,
    private size: string,
    public collapsibleState: vscode.TreeItemCollapsibleState) {
    super(label, collapsibleState);

    if (storagePath !== undefined) {
      const extractPath = path.join(storagePath, 'logpacks', this.label);
      if (fs.existsSync(extractPath)) {
        this.setDownloaded(true)
      } else {
        this.setDownloaded(false)
      }
    } else {
      this.setDownloaded(false)
    }

    /* this.command = {
      command: 'logpack.doubleClick',
      title: 'select logpack for double click',
      arguments: [this]
    }; */
  }

  get description(): string {
    return this.size;
  }

  get localPath(): fs.PathLike {
    if (this.storagePath !== undefined) {
      return path.join(this.storagePath, 'logpacks', this.label);
    }
    return '';
  }

  getDownloaded() {
    return this.isDownloaded
  }

  setDownloaded(isDownloaded: boolean) {
    if (isDownloaded) {
      // adjust icon
      this.iconPath = {
        light: path.join(__filename, '..', '..', 'assets', 'box 3 fill.svg'),
        dark: path.join(__filename, '..', '..', 'assets', 'box 3 fill.svg'),
      };
      this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
      this.contextValue = 'logpack.local'
    } else {
      // adjust icon
      this.iconPath = {
        light: path.join(__filename, '..', '..', 'assets', 'box 3 line.svg'),
        dark: path.join(__filename, '..', '..', 'assets', 'box 3 line.svg'),
      };
      this.collapsibleState = vscode.TreeItemCollapsibleState.None;
      this.contextValue = 'logpack'
    }
    this.isDownloaded = isDownloaded
  }

  async download() {
    if (this.storagePath === undefined) {
      console.error('storage path not set in download method')
      return
    }
    try {
      // download the file
      const client = new ftp.Client();
      await client.access({
        host: 'waws-prod-db3-139.ftp.azurewebsites.windows.net',
        user: 'lp-test-storage\\$lp-test-storage',
        password: 'yQGWZ2mRCcezEqKEgR2kYrjlceJimhg6nj5c41PQwHige6hrcX1kehin2LYb'
      });
      const downloadPath = path.join(this.storagePath, 'logpacks')
      const extractPath = path.join(this.storagePath, 'logpacks', this.label)
      fs.mkdirSync(extractPath, { recursive: true })
      const zipPath = path.join(downloadPath, this.fileInfo.name)
      await client.downloadTo(zipPath, this.fileInfo.name)

      // extract
      const zip = new AdmZip(zipPath)
      zip.extractAllTo(extractPath, true)

      // delete lp zip file
      fs.unlinkSync(zipPath)

      // update download state
      this.setDownloaded(true)

      // delete the zip file
      return Promise.resolve()
    }
    catch (error) {
      console.error(error);
    }
  }

  async remove() {
    if (this.storagePath === undefined) {
      console.error('storage path not set in download method')
      return Promise.reject()
    }

    // delete locally
    const extractPath = path.join(this.storagePath, 'logpacks', this.label);
    if (fs.existsSync(extractPath)) {
      await this.deleteFolderRecursive(extractPath)
    }

    // update download state
    this.setDownloaded(false)

    return Promise.resolve()
  }

  async delete() {
    if (this.storagePath === undefined) {
      console.error('storage path not set in download method')
      return Promise.reject()
    }

    // delete locally
    await this.remove()

    // delete on remote
    const client = new ftp.Client();
    await client.access({
      host: 'waws-prod-db3-139.ftp.azurewebsites.windows.net',
      user: 'lp-test-storage\\$lp-test-storage',
      password: 'yQGWZ2mRCcezEqKEgR2kYrjlceJimhg6nj5c41PQwHige6hrcX1kehin2LYb'
    });
    await client.remove(this.fileInfo.name)

    return Promise.resolve()
  }

  async deleteFolderRecursive(p: string)  {
    if (fs.existsSync(p)) {
      for (let entry of await afs.readdir(p)) {
        const curPath = path.join(p, entry);
        if ((await afs.lstat(curPath)).isDirectory())
          await this.deleteFolderRecursive(curPath);
        else await afs.unlink(curPath);
      }
      await afs.rmdir(p);
    }
  }

  contextValue = 'logpack';
}
