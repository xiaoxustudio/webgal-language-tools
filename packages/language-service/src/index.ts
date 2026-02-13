import type { VirtualEntry, VirtualFileSystem } from "./vfs/types";
import { createVirtualFileSystem } from "./vfs/adapter";
import { createMemoryVolarFileSystem } from "./vfs/memory";

export function createMemoryFileSystem(options?: {
	root?: string;
	tree?: VirtualEntry;
}): VirtualFileSystem {
	const fs = createMemoryVolarFileSystem(options);
	return createVirtualFileSystem(fs);
}

export {
	createWebgalClientHandlers,
	registerWebgalClientHandlers
} from "./client-handlers";
export * from "./vfs";
export * from "./monaco";
