import { setupTabUpdates } from "../maze-utils/src/tab-updates";
import { setupBackgroundRequestProxy } from "../maze-utils/src/background-request-proxy";
import { generateUserID } from "../maze-utils/src/setup";
import Config from "./config/config";
import { isSafari } from "../maze-utils/src/config";
import * as CompileConfig from "../config.json";
import { isFirefoxOrSafari } from "../maze-utils/src";
import { logError } from "./utils/logger";
import { waitFor } from "../maze-utils/src";

setupTabUpdates(Config);
setupBackgroundRequestProxy();

waitFor(() => Config.isReady()).then(() => {
    // Check every time since sometimes initial onInstall isn't called
    if (!Config.config!.userID) {
        const setupUserID = async () => {
            const userID = Config.config!.userID;
    
            // If there is no userID, then it is the first install.
            if (!userID){
                // First check for config from SponsorBlock extension
                const sponsorBlockConfig = await Promise.race([
                    new Promise((resolve) => setTimeout(resolve, 1000)),
                    new Promise((resolve) => {
                        const extensionIds = getExtensionIdsToImportFrom();
                        
                        for (const id of extensionIds) {
                            chrome.runtime.sendMessage(id, { message: "requestConfig" }, (response) => {
                                if (response) {
                                    resolve(response);
                                }
                            });
                        }
                    })
                ]);
    
                if (sponsorBlockConfig) {
                    Config.config!.userID = sponsorBlockConfig["userID"];
                    Config.config!.allowExpirements = sponsorBlockConfig["allowExpirements"];
                    Config.config!.showDonationLink = sponsorBlockConfig["showDonationLink"];
                    Config.config!.showUpsells = sponsorBlockConfig["showUpsells"];
                    Config.config!.darkMode = sponsorBlockConfig["darkMode"];
                    Config.config!.importedConfig = true;
                }
                
                if (!Config.config!.userID) {
                    const newUserID = generateUserID();
                    Config.config!.userID = newUserID;
                }
    
                setTimeout(() => void chrome.tabs.create({url: chrome.runtime.getURL("/help.html")}), 100);
            }
        };
    
        if (isFirefoxOrSafari() && !isSafari()) {
            // This let's the config sync to run fully before checking.
            // This is required on Firefox
            setTimeout(() => void setupUserID(), 1500);
        } else {
            waitFor(() => Config.isReady()).then(() => setupUserID()).catch(logError);
        }
    }
}).catch(logError);

chrome.runtime.onMessage.addListener((request) =>  {
    switch(request.message) {
        case "openConfig":
            void chrome.tabs.create({url: chrome.runtime.getURL('options/options.html' + (request.hash ? '#' + request.hash : ''))});
            return false;
        case "openHelp":
            void chrome.tabs.create({url: chrome.runtime.getURL('help.html')});
            return false;
    }

    return false;
});

function getExtensionIdsToImportFrom(): string[] {
    if (isSafari()) {
        return CompileConfig.extensionImportList.safari;
    } else if (isFirefoxOrSafari()) {
        return CompileConfig.extensionImportList.firefox;
    } else {
        return CompileConfig.extensionImportList.chromium;
    }
}

chrome.runtime.onMessageExternal.addListener((request, sender, callback) => {
    if (sender.id && getExtensionIdsToImportFrom().includes(sender.id)) {
        if (request.message === "isInstalled") {
            callback(true);
        }
    }
});