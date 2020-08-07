// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import * as path from 'path'
import { LogPackProvider } from './logPacksProvider'
import { LogPackEntry } from './LogPackEntry'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  console.log(vscode.workspace.rootPath)

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "logpack" is now active!');

  const logPackProvider = new LogPackProvider(vscode.workspace.rootPath)

  const treeview = vscode.window.createTreeView(
    'logpacks',
    {
      canSelectMany: true,
      treeDataProvider: logPackProvider
    }
  )

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  vscode.commands.registerCommand('logpack.selectLogPackEntry', async (lpe:LogPackEntry) => {
    console.log(lpe.path.toString())
    console.log(lpe.file.name)
    const doc = await vscode.workspace.openTextDocument(lpe.path.toString())
    await vscode.window.showTextDocument(doc, { preview: false })
  })
  vscode.commands.registerCommand('logpack.refreshAll', () => { logPackProvider.refreshAll() })
  vscode.commands.registerCommand('logpack.download', lp => logPackProvider.download(lp))
  vscode.commands.registerCommand('logpack.doubleClick', async lp => await logPackProvider.doubleClick(lp))
  vscode.commands.registerCommand('logpack.remove', (lp, lps) => logPackProvider.remove(lp, lps))
  vscode.commands.registerCommand('logpack.delete', (lp, lps) => logPackProvider.delete(lp, lps))
}

// this method is called when your extension is deactivated
export function deactivate() {}
