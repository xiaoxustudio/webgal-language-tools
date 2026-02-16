import * as Net from "net";
import { XRDebugSession } from "./debugSession";
import { fsAccessor } from "@webgal/language-core";

let port = 0;

const args = process.argv.slice(2);
args.forEach(function (val) {
	const portMatch = /^--server=(\d{4,5})$/.exec(val);
	if (portMatch) {
		port = parseInt(portMatch[1], 10);
	}
});

if (port > 0) {
	console.error(`waiting for debug protocol on port ${port}`);
	Net.createServer((socket) => {
		console.error(">> accepted connection from client");
		socket.on("end", () => {
			console.error(">> client connection closed\n");
		});
		const session = new XRDebugSession(fsAccessor);
		session.setRunAsServer(true);
		session.start(socket, socket);
	}).listen(port);
} else {
	const session = new XRDebugSession(fsAccessor);
	process.on("SIGTERM", () => {
		session.shutdown();
	});
	session.start(process.stdin, process.stdout);
}
