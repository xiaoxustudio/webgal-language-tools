import type { DiagnosticItem, DiagnosticRule, RuleContext } from "./types";

function removeLeadingWhitespace(text: string): string {
	return text.replace(/^[\n\r\t]+/, "");
}

const extraSpacesRule: DiagnosticRule = {
	id: "EXTRA_SPACES",
	label: "指令格式不规范",
	validate(ctx: RuleContext) {
		const results: DiagnosticItem[] = [];
		const regex = /(\s{2,}-[A-Za-z]+)\b/g;
		let m: RegExpExecArray | null;
		while ((m = regex.exec(ctx.text)) && results.length < ctx.maxProblems) {
			results.push({
				offset: m.index,
				length: m[0].length,
				message: m[0],
				category: `${this.label} ${this.id}`
			});
		}
		return results;
	}
};

const varStartsWithNumberRule: DiagnosticRule = {
	id: "VAR_STARTS_WITH_NUMBER",
	label: "变量命名不规范",
	validate(ctx: RuleContext) {
		const results: DiagnosticItem[] = [];
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
				results.push({
					offset,
					length: m[0].length,
					message: "变量名开头为数字",
					category: `${this.label} ${this.id}`
				});
			}
		}
		return results;
	}
};

const missingSpaceAfterColonRule: DiagnosticRule = {
	id: "MISSING_SPACE_AFTER_COLON",
	label: "指令不规范",
	validate(ctx: RuleContext) {
		const results: DiagnosticItem[] = [];
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
				results.push({
					offset: ctx.lineOffsets[i],
					length: m[0].length,
					message: m[0],
					category: `${this.label} ${this.id}`
				});
			}
		}
		return results;
	}
};

const spacesInInterpolationRule: DiagnosticRule = {
	id: "SPACES_IN_INTERPOLATION",
	label: "变量插值不规范",
	validate(ctx: RuleContext) {
		const results: DiagnosticItem[] = [];
		const regex = /{(\S+\s{1,}|\s{1,}\S+|\s{1,}\S+\s{1,})}/g;
		let m: RegExpExecArray | null;
		while ((m = regex.exec(ctx.text)) && results.length < ctx.maxProblems) {
			results.push({
				offset: m.index,
				length: m[0].length,
				message: m[0],
				category: `${this.label} ${this.id}`
			});
		}
		return results;
	}
};

const missingEndingSemicolonRule: DiagnosticRule = {
	id: "MISSING_ENDING_SEMICOLON",
	label: "语句不规范",
	validate(ctx: RuleContext) {
		const results: DiagnosticItem[] = [];
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
				results.push({
					offset: ctx.lineOffsets[i] + leadingWs,
					length: trimmed.length,
					message: "语句缺少结束标识",
					category: `${this.label} ${this.id}`
				});
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
