import { URI } from "vscode-uri";

export const normalizePath = (input: string) => {
	let path = input.replace(/\\/g, "/").replace(/\/+/g, "/");
	if (path === "") {
		return "/";
	}
	if (!path.startsWith("/")) {
		path = "/" + path;
	}
	if (path.length > 1 && path.endsWith("/")) {
		path = path.slice(0, -1);
	}
	return path;
};

export const joinPaths = (...parts: string[]) => {
	const joined = parts.filter((part) => part && part !== "/").join("/");
	return normalizePath(joined);
};

export const uriToPath = (value: string | URI) => {
	const uriString = typeof value === "string" ? value : value.toString();
	if (uriString.startsWith("file://")) {
		const stripped = uriString.replace(/^file:\/*/i, "/");
		const decoded = decodeURIComponent(stripped).replace(/\\/g, "/");
		if (/^\/[a-zA-Z]:\//.test(decoded)) {
			return decoded.slice(1);
		}
		return normalizePath(decoded);
	}
	return normalizePath(uriString);
};

export const pathToUri = (path: string) => {
	if (path.startsWith("file://")) {
		return URI.parse(path);
	}
	if (/^[a-zA-Z]:[\\/]/.test(path)) {
		return URI.file(path);
	}
	if (path.startsWith("/")) {
		return URI.file(path);
	}
	return URI.parse(path);
};

export const toVfsPath = (value: string) =>
	value.startsWith("file://") ? uriToPath(value) : value;
