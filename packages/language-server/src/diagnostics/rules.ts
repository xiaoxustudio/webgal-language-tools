import type { DiagnosticRule } from "./types";
import { makeDiagnostic, removeLeadingWhitespace } from "./utils";

const extraSpacesRule: DiagnosticRule = {
	id: "EXTRA_SPACES",
	label: "指令格式不规范",
	validate(ctx) {
		const results = [];
		/* 
		指令参数只能以-xxx的形式存在，不能存在空格
		多个指令参数通过空格分隔
		*/
		const regex = /(\s{2,}-[A-Za-z]+)\b/g;
		let m: RegExpExecArray | null;
		while ((m = regex.exec(ctx.text)) && results.length < ctx.maxProblems) {
			results.push(
				makeDiagnostic(
					ctx.document,
					m.index,
					m[0].length,
					m[0],
					`${this.label} ${this.id}`,
					ctx.hasRelatedInfo
				)
			);
		}
		return results;
	}
};

const varStartsWithNumberRule: DiagnosticRule = {
	id: "VAR_STARTS_WITH_NUMBER",
	label: "变量命名不规范",
	validate(ctx) {
		const results = [];
		/* 变量名称需要以编程中的变量名称命名 */
		const regex = /^setVar:([0-9]+\S+);/g;
		for (
			let i = 0;
			i < ctx.lines.length && results.length < ctx.maxProblems;
			i++
		) {
			const cleaned = removeLeadingWhitespace(ctx.lines[i]);
			regex.lastIndex = 0;
			const m = regex.exec(cleaned);
			if (m) {
				const leadingWs = ctx.lines[i].length - cleaned.length;
				const offset = ctx.lineOffsets[i] + leadingWs;
				results.push(
					makeDiagnostic(
						ctx.document,
						offset,
						m[0].length,
						"变量名开头为数字",
						`${this.label} ${this.id}`,
						true
					)
				);
			}
		}
		return results;
	}
};

const missingSpaceAfterColonRule: DiagnosticRule = {
	id: "MISSING_SPACE_AFTER_COLON",
	label: "指令不规范",
	validate(ctx) {
		const results = [];
		/* 单行指令的第一个冒号后面必须有一个空格 */
		const regex = /^([^\s]+):[^\s](.+)/g;
		for (
			let i = 0;
			i < ctx.lines.length && results.length < ctx.maxProblems;
			i++
		) {
			const line = ctx.lines[i];
			regex.lastIndex = 0;
			const m = regex.exec(line);
			if (m) {
				results.push(
					makeDiagnostic(
						ctx.document,
						ctx.lineOffsets[i],
						m[0].length,
						m[0],
						`${this.label} ${this.id}`,
						ctx.hasRelatedInfo
					)
				);
			}
		}
		return results;
	}
};

const spacesInInterpolationRule: DiagnosticRule = {
	id: "SPACES_IN_INTERPOLATION",
	label: "变量插值不规范",
	validate(ctx) {
		const results = [];
		/* 变量插值中不能存在空格 */
		const regex = /{(\S+\s{1,}|\s{1,}\S+|\s{1,}\S+\s{1,})}/g;
		let m: RegExpExecArray | null;
		while ((m = regex.exec(ctx.text)) && results.length < ctx.maxProblems) {
			results.push(
				makeDiagnostic(
					ctx.document,
					m.index,
					m[0].length,
					m[0],
					`${this.label} ${this.id}`,
					ctx.hasRelatedInfo
				)
			);
		}
		return results;
	}
};

const missingEndingSemicolonRule: DiagnosticRule = {
	id: "MISSING_ENDING_SEMICOLON",
	label: "语句不规范",
	validate(ctx) {
		const results = [];
		/* 单行指令结束必须要有; */
		for (
			let i = 0;
			i < ctx.lines.length && results.length < ctx.maxProblems;
			i++
		) {
			const cleaned = removeLeadingWhitespace(ctx.lines[i]);
			if (cleaned.length === 0) {
				continue;
			}
			if (!cleaned.includes(";")) {
				const leadingWs = ctx.lines[i].length - cleaned.length;
				const trimmed = cleaned.trimEnd();
				results.push(
					makeDiagnostic(
						ctx.document,
						ctx.lineOffsets[i] + leadingWs,
						trimmed.length,
						"语句缺少结束标识",
						`${this.label} ${this.id}`,
						true
					)
				);
			}
		}
		return results;
	}
};

export const rules: DiagnosticRule[] = [
	extraSpacesRule,
	varStartsWithNumberRule,
	missingSpaceAfterColonRule,
	spacesInInterpolationRule,
	missingEndingSemicolonRule
];
