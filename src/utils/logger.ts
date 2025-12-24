import * as CompileConfig from "../../config.json";

export function logError(...vals: unknown[]): void {
    console.error("[SL]", ...vals);
}

export function log(...text: unknown[]): void {
    if (CompileConfig.debug) {
        console.log(...text);
    } else {
        window["SLLogs"] ??= [];
        window["SLLogs"].push({
            time: Date.now(),
            text
        });

        if (window["SLLogs"].length > 100) {
            window["SLLogs"].shift();
        }
    }
}
