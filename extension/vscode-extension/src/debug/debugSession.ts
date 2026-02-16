import {
	Handles,
	InitializedEvent,
	Logger,
	logger,
	LoggingDebugSession,
	Scope,
	StackFrame,
	StoppedEvent,
	Thread,
	TerminatedEvent
} from "@vscode/debugadapter";
import { getGameData } from "@/utils/utils";
import XRRuntime from "@/ws";
import { DebugProtocol } from "vscode-debugprotocol";
import { RuntimeVariable, FileAccessor } from "@webgal/language-core";

interface IAttachRequestArguments extends ILaunchRequestArguments {}
interface ILaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	program: string;
	stopOnEntry?: boolean;
	trace?: boolean;
	noDebug?: boolean;
	compileError?: "default" | "show" | "hide";
	ws?: string;
}

type VariableHandle =
	| { type: "scope"; scope: "locals" | "env" | "scene" }
	| { type: "collection"; items: RuntimeVariable[] }
	| RuntimeVariable;

export class XRDebugSession extends LoggingDebugSession {
	private static threadID = 1;
	private runtime: XRRuntime;
	private variableHandles = new Handles<VariableHandle>();
	private scopeHandles:
		| {
				locals: number;
				env: number;
				scene: number;
		  }
		| undefined;
	private _valuesInHex = false;
	constructor(FileAccess: FileAccessor) {
		super("webgal-debug.txt");
		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);
		this.runtime = new XRRuntime(FileAccess);
		this.runtime.on("terminated", () => {
			this.sendEvent(new TerminatedEvent());
		});
	}
	dispose() {
		this.runtime.dispose();
	}
	protected initializeRequest(
		response: DebugProtocol.InitializeResponse
	): void {
		response.body = response.body || {};
		response.body.supportsSetVariable = true;
		response.body.supportsConfigurationDoneRequest = true;
		response.body.supportsStepBack = false;
		response.body.supportsSteppingGranularity = false;
		response.body.supportsEvaluateForHovers = false;
		response.body.supportsRestartFrame = false;
		response.body.supportsGotoTargetsRequest = false;
		response.body.supportsStepInTargetsRequest = false;
		response.body.supportsCompletionsRequest = false;
		response.body.supportsCancelRequest = false;
		response.body.supportsBreakpointLocationsRequest = false;
		response.body.supportsInstructionBreakpoints = false;
		response.body.supportsHitConditionalBreakpoints = false;

		this.sendResponse(response);
		console.log("(webgal)initializing");
		this.sendEvent(new InitializedEvent());
	}
	protected attachRequest(
		response: DebugProtocol.AttachResponse,
		args: IAttachRequestArguments
	) {
		return this.launchRequest(response, args);
	}
	protected restartRequest(response: DebugProtocol.RestartResponse): void {
		this.runtime.sendRunLine(0);
		this.sendResponse(response);
	}
	protected async launchRequest(
		response: DebugProtocol.LaunchResponse,
		args: ILaunchRequestArguments
	): Promise<void> {
		logger.setup(
			args.trace ? Logger.LogLevel.Verbose : Logger.LogLevel.Stop,
			false
		);
		try {
			await this.runtime.start({
				program: args.program,
				ws: args.ws
			});
			this.sendEvent(new StoppedEvent("entry", XRDebugSession.threadID));
			this.sendResponse(response);
		} catch (error) {
			this.sendErrorResponse(response, {
				id: 1,
				format: String(error)
			});
		}
	}
	protected stepBackRequest(response: DebugProtocol.StepBackResponse): void {
		this.sendEvent(new StoppedEvent("entry"));
		this.sendResponse(response);
	}
	protected evaluateRequest(
		response: DebugProtocol.EvaluateResponse,
		args: DebugProtocol.EvaluateArguments
	): void {
		if (args.context === "repl") {
			const expression = args.expression.trim();
			const _data = getGameData() as any;
			const _stage = _data?.stageSyncMsg ?? {};
			const _scene = _data?.sceneMsg ?? {};
			const _start = expression.substring(0, 1);
			if (
				_start === "$" &&
				Object.prototype.hasOwnProperty.call(
					_stage,
					expression.substring(1)
				)
			) {
				response.body = {
					result: String(_stage[expression.substring(1)]),
					variablesReference: 0
				};
			} else if (
				_start === "#" &&
				Object.prototype.hasOwnProperty.call(
					_scene,
					expression.substring(1)
				)
			) {
				response.body = {
					result: String(_scene[expression.substring(1)]),
					variablesReference: 0
				};
			} else if (_start === "@") {
				switch (expression) {
					case "@run":
						response.body = {
							result: String(Object.keys(_scene)),
							variablesReference: 0
						};
						break;
					case "@env":
						response.body = {
							result: String(Object.keys(_stage)),
							variablesReference: 0
						};
						break;
					default:
						const _ex = /@set\s+(\S+)\s+(\S+)/.exec(expression);
						const _ex_run = /@script\s+(.*)/.exec(expression);
						if (_ex) {
							this.runtime.setVariable(_ex[1], _ex[2]);
							response.body = {
								result: _ex[2],
								variablesReference: 0
							};
						} else if (_ex_run) {
							this.runtime.sendScript(`${_ex_run[1]}`);
							response.body = {
								result: _ex_run[1],
								variablesReference: 0
							};
						} else {
							response.body = {
								result: "null",
								variablesReference: 0
							};
						}
						break;
				}
			} else if (
				Object.prototype.hasOwnProperty.call(_stage, "GameVar") &&
				Object.prototype.hasOwnProperty.call(_stage.GameVar, expression)
			) {
				response.body = {
					result: String(_stage.GameVar[expression]),
					variablesReference: 0
				};
			} else {
				response.body = {
					result: "null",
					variablesReference: 0
				};
			}
		}
		this.sendResponse(response);
	}
	protected configurationDoneRequest(response: DebugProtocol.Response) {
		this.sendResponse(response);
	}
	protected threadsRequest(response: DebugProtocol.Response) {
		response.body = {
			threads: [new Thread(XRDebugSession.threadID, "thread 1")]
		};

		this.sendResponse(response);
	}
	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse) {
		response.body = {
			stackFrames: [new StackFrame(1, "WebGal StackFrame")]
		};
		this.sendResponse(response);
	}
	protected scopesRequest(response: DebugProtocol.ScopesResponse): void {
		this.scopeHandles = {
			locals: this.variableHandles.create({
				type: "scope",
				scope: "locals"
			}),
			env: this.variableHandles.create({ type: "scope", scope: "env" }),
			scene: this.variableHandles.create({
				type: "scope",
				scope: "scene"
			})
		};
		response.body = {
			scopes: [
				new Scope("Locals", this.scopeHandles.locals, false),
				new Scope("Env", this.scopeHandles.env, false),
				new Scope("Scene", this.scopeHandles.scene, false)
			]
		};
		this.sendResponse(response);
	}
	protected variablesRequest(
		response: DebugProtocol.VariablesResponse,
		args: DebugProtocol.VariablesArguments
	): void {
		const handle = this.variableHandles.get(args.variablesReference);
		let vs: DebugProtocol.Variable[] = [];
		if (handle && typeof handle === "object" && "type" in handle) {
			if (handle.type === "scope") {
				const items =
					handle.scope === "locals"
						? this.runtime.getLocalVariables("var")
						: handle.scope === "scene"
							? this.runtime.getLocalVariables("scene")
							: this.runtime.getLocalVariables("env");
				vs = items.map((v) => this.convertFromRuntime(v));
			} else if (handle.type === "collection") {
				vs = handle.items.map((v) => this.convertFromRuntime(v));
			}
		} else if (handle instanceof RuntimeVariable) {
			vs = [this.convertFromRuntime(handle)];
		}
		response.body = {
			variables: vs
		};
		this.sendResponse(response);
	}
	protected setVariableRequest(
		response: DebugProtocol.SetVariableResponse,
		args: DebugProtocol.SetVariableArguments
	): void {
		const handle = this.variableHandles.get(args.variablesReference);
		if (handle && typeof handle === "object" && "type" in handle) {
			if (handle.type === "scope" && handle.scope === "locals") {
				this.runtime.setVariable(args.name, args.value);
			}
			response.body = {
				value: args.value,
				variablesReference: 0
			};
		}
		this.sendResponse(response);
	}
	private formatNumber(x: number) {
		return this._valuesInHex ? "0x" + x.toString(16) : x.toString(10);
	}
	private convertFromRuntime(v: RuntimeVariable): DebugProtocol.Variable {
		const rawValue = v.value as unknown;
		let dapVariable: DebugProtocol.Variable = {
			name: v.name,
			value: "null",
			type: typeof rawValue,
			variablesReference: 0,
			evaluateName: v.name
		};
		if (Array.isArray(rawValue)) {
			const items = this.toRuntimeChildren(rawValue);
			dapVariable.variablesReference = this.variableHandles.create({
				type: "collection",
				items
			});
			dapVariable.value = `Array(${items.length})`;
			dapVariable.type = "array";
		} else if (rawValue && typeof rawValue === "object") {
			const items = this.toRuntimeChildren(rawValue);
			dapVariable.variablesReference = this.variableHandles.create({
				type: "collection",
				items
			});
			dapVariable.value = "Object";
			dapVariable.type = "object";
		} else {
			switch (typeof rawValue) {
				case "number":
					if (Math.round(rawValue) === rawValue) {
						dapVariable.value = this.formatNumber(rawValue);
						dapVariable.type = "integer";
					} else {
						dapVariable.value = rawValue.toString();
						dapVariable.type = "float";
					}
					break;
				case "string":
					dapVariable.value = `"${rawValue}"`;
					break;
				case "boolean":
					dapVariable.value = rawValue ? "true" : "false";
					break;
				default:
					dapVariable.value = String(rawValue);
					break;
			}
		}

		return dapVariable;
	}
	private toRuntimeChildren(value: unknown): RuntimeVariable[] {
		if (Array.isArray(value)) {
			if (value.every((item) => item instanceof RuntimeVariable)) {
				return value as RuntimeVariable[];
			}
			return value.map(
				(item, index) => new RuntimeVariable(String(index), item)
			);
		}
		if (value && typeof value === "object") {
			const obj = value as Record<string, unknown>;
			return Object.keys(obj).map(
				(key) => new RuntimeVariable(key, obj[key] as any)
			);
		}
		return [];
	}
	protected disconnectRequest(
		response: DebugProtocol.DisconnectResponse
	): void {
		this.runtime.dispose();
		this.sendResponse(response);
		this.sendEvent(new TerminatedEvent());
	}
	protected customRequest(
		command: string,
		response: DebugProtocol.Response
	): void {
		void command;
		this.sendResponse(response);
	}
}
