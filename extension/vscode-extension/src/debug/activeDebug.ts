import * as vscode from "vscode";
import { DebugSession } from "./debugSession";
import { fsAccessor } from "@webgal/language-core";

export class DebugAdapterDescriptorFactory
	implements vscode.DebugAdapterDescriptorFactory
{
	createDebugAdapterDescriptor(
		session: vscode.DebugSession
	): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		void session;
		return new vscode.DebugAdapterInlineImplementation(
			new DebugSession(fsAccessor)
		);
	}
}
