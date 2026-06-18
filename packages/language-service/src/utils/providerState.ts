import definedMap from "./definedMap";
import type { StateMap } from "@webgal/language-core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StateNode = Record<string, any>;

// 获取属性 xxxx.xxxx.xxx
export const getState = (
	propertiesArray: string[],
	prev = definedMap
): StateMap | undefined => {
	if (!propertiesArray || propertiesArray.length === 0) {
		return undefined;
	}

	let current: StateNode = prev;
	for (const curr of propertiesArray) {
		const result = current[curr];
		if (result) {
			const value = result.value;
			if (
				value &&
				typeof value === "object" &&
				Object.keys(value).length > 0
			) {
				current = value;
			} else {
				current = result;
			}
		} else {
			// 就没有这个属性
			return undefined;
		}
	}

	return current as StateMap;
};
