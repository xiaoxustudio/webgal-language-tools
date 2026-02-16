import * as vscode from "vscode";
import { XRDebugSession } from "./debugSession";
import { fsAccessor } from "@webgal/language-core";

export class XRDebugAdapterDescriptorFactory
	implements vscode.DebugAdapterDescriptorFactory
{
	createDebugAdapterDescriptor(
		session: vscode.DebugSession
	): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		void session;
		return new vscode.DebugAdapterInlineImplementation(
			new XRDebugSession(fsAccessor)
		);
	}
}
