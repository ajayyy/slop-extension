import { Keybind, ProtoConfig } from "../../maze-utils/src/config";
import { logError } from "../utils/logger";
import * as CompileConfig from "../../config.json";

export enum LabelAction {
    Nothing = "nothing",
    Hide = "hide",
    Color = "color",
    SolidColor = "solid-color",
    Bar = "bar",
    Icon = "icon"
}

export enum Category {
    Human = "human",
    AIScript = "ai-script",
    AIMusic = "ai-music",
    AIThumbnail = "ai-thumbnail",
    AIGraphicsMost = "ai-graphics-most",
    AIGraphicsLimited = "ai-graphics-limited",
    AIGraphicsCommentary = "ai-graphics-commentary",
    Scam = "scam",
    TTSMostlyTTS = "tts-mostly-tts",
    TTSMostlyHuman = "tts-mostly-human",
    TTSAI = "tts-ai",
    AITopicNoExamples = "ai-topic-no-examples",
    AITopicExamples = "ai-topic-examples",
    Fiction = "fiction",
    Funny = "funny",
    Entertaining = "entertaining",
    Creative = "creative",
    Informative = "informative",
    Boring = "boring",
    LowQuality = "low-quality",
    Misleading = "misleading"
}

export type LabelConfig = {
    name: string;
    categories: Category[];
} & ({
    action: LabelAction.Nothing;
} | {
    action: LabelAction.Color;
    color: string;
} | {
    action: LabelAction.SolidColor;
    color: string;
} | {
    action: LabelAction.Bar;
    color: string;
} | {
    action: LabelAction.Icon;
});

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
    labelConfig: LabelConfig[];
    serverAddress: string | null;
    extensionEnabled: boolean;
    lastIncognitoStatus: boolean;
    showActivatedMessage: boolean;
    enableExtensionKey: Keybind;
}

interface SBStorage {
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
    labelConfig: [{
        name: chrome.i18n.getMessage("slopAIGroup"),
        action: LabelAction.Color,
        color: "#ff8151",
        categories: [
            Category.AIScript,
            Category.AIMusic,
            Category.AIThumbnail,
            Category.AIGraphicsMost,
            Category.AIGraphicsCommentary,
            Category.TTSMostlyTTS,
            Category.TTSAI
        ]
    }, {
        name: chrome.i18n.getMessage("slopBadGroup"),
        action: LabelAction.Color,
        color: "#4a3687",
        categories: [
            Category.Boring,
            Category.LowQuality,
            Category.Misleading
        ]
    }, {
        name: chrome.i18n.getMessage("slopScamGroup"),
        action: LabelAction.Color,
        color: "#ff0000",
        categories: [
            Category.Scam,
        ]
    }] as LabelConfig[],
    serverAddress: CompileConfig.serverAddress,
    extensionEnabled: true,
    lastIncognitoStatus: false,
    showActivatedMessage: false,
    enableExtensionKey: { key: "e", ctrl: true, shift: true, alt: true }
};

const Config = new ConfigClass(syncDefaults, null, migrateOldSyncFormats);
export default Config;
