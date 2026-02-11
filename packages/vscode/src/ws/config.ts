import * as vscode from "vscode";
export class XRDebugConfigurationProvider
	implements vscode.DebugConfigurationProvider
{
	resolveDebugConfiguration?(
		_: vscode.WorkspaceFolder | undefined,
		debugConfiguration: vscode.DebugConfiguration,
		__?: vscode.CancellationToken,
	): vscode.ProviderResult<vscode.DebugConfiguration> {
		return debugConfiguration;
	}
}
