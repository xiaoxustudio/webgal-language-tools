let Game_Data = {}; // 游戏全局配置
let WS: any = null;

export function getGameData() {
	return Game_Data;
}
export function setGameData(data: object) {
	Game_Data = data;
}
export function enableGameStatus(_WS: any) {
	setWS(_WS);
}
export function disableGameStatus() {
	setWS(null);
}
function setWS(_WS: any) {
	WS = _WS;
}
export function getWS() {
	return WS;
}
export function is_JSON(str: string) {
	try {
		JSON.parse(str);
		return true;
	} catch {
		return false;
	}
}
export const selector = { scheme: "file", language: "webgal" };
export const selectorConfig = { scheme: "file", language: "webgal-config" };
