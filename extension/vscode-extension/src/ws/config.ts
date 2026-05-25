import type * as vscode from "vscode";
export class XRDebugConfigurationProvider
	implements vscode.DebugConfigurationProvider
{
	resolveDebugConfiguration?(
		_: vscode.WorkspaceFolder | undefined,
		debugConfiguration: vscode.DebugConfiguration
	): vscode.ProviderResult<vscode.DebugConfiguration> {
		return debugConfiguration;
	}
}
