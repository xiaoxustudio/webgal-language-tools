import definedMap from "./definedMap";

export interface StateMap {
	key: string; // 键名
	description: string; // 描述
	type?: {
		key: string; // 类型
		description: string; // 描述
	}; // 类型
	value?: StateMap | Record<string, StateMap> | string; // 值
	__WG$key?: string; // 父级键名
	__WG$description?: string; // 父级描述
}

let index = 0;
// 获取属性 xxxx.xxxx.xxx
export const getState = (propertiesArray: string[], prev: any = definedMap) => {
	if (!propertiesArray || propertiesArray.length === 0) return undefined;

	for (const curr of propertiesArray) {
		const result = prev[curr as keyof typeof prev];
		if (result) {
			if (
				"value" in result &&
				result.value &&
				typeof result?.value === "object" &&
				Object.keys(result?.value).length > 0
			) {
				prev = result.value;
			} else {
				prev = result;
			}
		} else {
			// 就没有这个属性
			return undefined;
		}
		index++;
	}

	return prev;
};
