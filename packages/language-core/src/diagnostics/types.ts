export interface DiagnosticItem {
	offset: number;
	length: number;
	message: string;
	category: string;
}

export interface RuleContext {
	text: string;
	lines: string[];
	lineOffsets: number[];
	maxProblems: number;
}

export interface DiagnosticRule {
	id: string;
	label: string;
	validate(ctx: RuleContext): DiagnosticItem[];
}
