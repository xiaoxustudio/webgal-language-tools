import type { ChangeEvent } from "react";
import type { VirtualEntry } from "@webgal/language-service";
import FileTree from "./FileTree";

type SidebarProps = {
	newFilePath: string;
	newFolderPath: string;
	selectedPath: string | null;
	tree: VirtualEntry | null;
	rootPath: string;
	expandedPaths: Set<string>;
	onFilePathChange: (value: string) => void;
	onFolderPathChange: (value: string) => void;
	onCreateFile: () => void;
	onCreateFolder: () => void;
	onDeleteSelected: () => void;
	onSelectPath: (path: string) => void;
	onOpenFile: (path: string) => void;
	onTogglePath: (path: string) => void;
};

export default function Sidebar({
	newFilePath,
	newFolderPath,
	selectedPath,
	tree,
	rootPath,
	expandedPaths,
	onFilePathChange,
	onFolderPathChange,
	onCreateFile,
	onCreateFolder,
	onDeleteSelected,
	onSelectPath,
	onOpenFile,
	onTogglePath
}: SidebarProps) {
	return (
		<aside className="sidebar">
			<div className="sidebar-section">
				<div className="section-title">文件操作</div>
				<div className="form-row">
					<input
						value={newFilePath}
						onChange={(event: ChangeEvent<HTMLInputElement>) =>
							onFilePathChange(event.target.value)
						}
						placeholder="scene/new.txt"
					/>
					<button onClick={onCreateFile}>新建文件</button>
				</div>
				<div className="form-row">
					<input
						value={newFolderPath}
						onChange={(event: ChangeEvent<HTMLInputElement>) =>
							onFolderPathChange(event.target.value)
						}
						placeholder="scene/new-folder"
					/>
					<button onClick={onCreateFolder}>新建目录</button>
				</div>
				<div className="form-row">
					<button
						className="danger"
						onClick={onDeleteSelected}
						disabled={!selectedPath}
					>
						删除选中
					</button>
				</div>
			</div>
			<div className="sidebar-section">
				<div className="section-title">目录</div>
				<FileTree
					tree={tree}
					rootPath={rootPath}
					selectedPath={selectedPath}
					expandedPaths={expandedPaths}
					onSelectPath={onSelectPath}
					onOpenFile={onOpenFile}
					onTogglePath={onTogglePath}
				/>
			</div>
		</aside>
	);
}
