import type * as vscode from "vscode";
export class DebugConfigurationProvider
	implements vscode.DebugConfigurationProvider
{
	resolveDebugConfiguration?(
		_: vscode.WorkspaceFolder | undefined,
		debugConfiguration: vscode.DebugConfiguration
	): vscode.ProviderResult<vscode.DebugConfiguration> {
		return debugConfiguration;
	}
}
