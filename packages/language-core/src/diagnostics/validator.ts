import type { DiagnosticItem, RuleContext } from "./types";
import { rules } from "./rules";

export function validateText(text: string, maxProblems: number): DiagnosticItem[] {
	const lines = text.split(/\r\n|\n/);
	const lineOffsets: number[] = [0];
	for (let i = 0; i < text.length; i++) {
		if (text[i] === "\n") {
			lineOffsets.push(i + 1);
		}
	}
	const ctx: RuleContext = { text, lines, lineOffsets, maxProblems };
	const results: DiagnosticItem[] = [];
	for (const rule of rules) {
		if (results.length >= maxProblems) { break; }
		results.push(...rule.validate(ctx));
	}
	return results;
}
