import { Keybind, ProtoConfig } from "../../maze-utils/src/config";
import { logError } from "../utils/logger";
import * as CompileConfig from "../../config.json";

interface SBConfig {
    userID: string | null;
    vip: boolean;
    actAsVip: boolean;
    allowExpirements: boolean;
    showDonationLink: boolean;
    showUpsells: boolean;
    donateClicked: number;
    darkMode: boolean;
    importedConfig: boolean;
    invidiousInstances: string[];
    serverAddress: string | null;
    extensionEnabled: boolean;
    lastIncognitoStatus: boolean;
    showActivatedMessage: boolean;
    enableExtensionKey: Keybind;
}

interface BloomFilterStored {
    timeFetched: number;
    timeGenerated: number;
    lastUpdate: number;
    numberOfHashes: number;
    data: string;
}

interface SBStorage {
    navigationApiAvailable: boolean;
    //todo: switch to not loading this every time into memory, only save in background script
    bloom: Record<string, BloomFilterStored>;
}

class ConfigClass extends ProtoConfig<SBConfig, SBStorage> {
    resetToDefault() {
        chrome.storage.sync.set({
            ...this.syncDefaults,
            userID: this.config!.userID
        }).catch(logError);

        chrome.storage.local.set({
            ...this.localDefaults,
        }).catch(logError);
    }
}

// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
function migrateOldSyncFormats(config: SBConfig) {
}

const syncDefaults = {
    userID: null,
    vip: false,
    actAsVip: true,
    allowExpirements: true,
    showDonationLink: true,
    showUpsells: true,
    donateClicked: 0,
    darkMode: true,
    importedConfig: false,
    invidiousInstances: [],
    serverAddress: CompileConfig.serverAddress,
    extensionEnabled: true,
    lastIncognitoStatus: false,
    showActivatedMessage: false,
    enableExtensionKey: { key: "e", ctrl: true, shift: true, alt: true }
};

const localDefaults = {
    navigationApiAvailable: false,
    unsubmitted: {},
    bloom: {} //todo: maybe don't load this every time into here because it will slow down content script
};

const Config = new ConfigClass(syncDefaults, localDefaults, migrateOldSyncFormats, true);
export default Config;
