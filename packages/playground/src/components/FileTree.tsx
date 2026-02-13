import type { ReactNode } from "react";
import type { VirtualEntry } from "@webgal/language-service";

type FileTreeProps = {
	tree: VirtualEntry | null;
	rootPath: string;
	selectedPath: string | null;
	onSelectPath: (path: string) => void;
	onOpenFile: (path: string) => void;
};

export default function FileTree({
	tree,
	rootPath,
	selectedPath,
	onSelectPath,
	onOpenFile
}: FileTreeProps) {
	const renderEntry = (
		entry: VirtualEntry,
		path: string,
		depth: number
	): ReactNode => {
		const isDir = entry.type === "dir";
		const name = path === rootPath ? "game" : (path.split("/").pop() ?? path);
		const isSelected = selectedPath === path;
		if (isDir) {
			const children = Object.entries(entry.children)
				.sort(([aName, aEntry], [bName, bEntry]) => {
					if (aEntry.type !== bEntry.type) {
						return aEntry.type === "dir" ? -1 : 1;
					}
					return aName.localeCompare(bName);
				})
				.map(([childName, childEntry]) =>
					renderEntry(childEntry, `${path}/${childName}`, depth + 1)
				);
			return (
				<div key={path}>
					<div
						className={`tree-item dir${isSelected ? " selected" : ""}`}
						style={{ paddingLeft: depth * 12 }}
						onClick={() => onSelectPath(path)}
					>
						<span className="tree-icon">📁</span>
						<span className="tree-label">{name}</span>
					</div>
					{children}
				</div>
			);
		}
		return (
			<div
				key={path}
				className={`tree-item file${isSelected ? " selected" : ""}`}
				style={{ paddingLeft: depth * 12 }}
				onClick={() => {
					onSelectPath(path);
					onOpenFile(path);
				}}
			>
				<span className="tree-icon">📄</span>
				<span className="tree-label">{name}</span>
			</div>
		);
	};

	return (
		<div className="tree">
			{tree ? renderEntry(tree, rootPath, 0) : "正在加载..."}
		</div>
	);
}
