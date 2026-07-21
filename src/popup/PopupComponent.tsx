import * as React from "react";
import Config from "../config/config";
import { showDonationLink } from "../utils/configUtils";

export const PopupComponent = () => {
    const [extensionEnabled, setExtensionEnabled] = React.useState(Config.config!.extensionEnabled);

    return (
        <>
            <header className="sbPopupLogo">
                <img src="icons/logo.svg" alt="NoMoreSlop Logo" width="40" height="40" id="dearrowPopupLogo"/>
                <p className="u-mZ">
                    NoMoreSlop
                </p>
            </header>

            {/* Toggle Box */}
            <div className="sbControlsMenu">
                {/* github: mbledkowski/toggle-switch */}
                <label id="disableExtension" htmlFor="toggleSwitch" className="toggleSwitchContainer sbControlsMenu-item" role="button" tabIndex={0}>
                    <span className="toggleSwitchContainer-switch">
                        <input type="checkbox" 
                            style={{ "display": "none" }} 
                            id="toggleSwitch" 
                            checked={extensionEnabled}
                            onChange={(e) => {
                                Config.config!.extensionEnabled = e.target.checked;
                                setExtensionEnabled(e.target.checked)
                            }}/>
                        <span className="switchBg shadow"></span>
                        <span className="switchBg white"></span>
                        <span className="switchBg blue"></span>
                        <span className="switchDot"></span>
                    </span>
                    <span id="disableSkipping" className={extensionEnabled ? " hidden" : ""}>
                        {chrome.i18n.getMessage("disable")}
                    </span>
                    <span id="enableSkipping" className={!extensionEnabled ? " hidden" : ""}>
                        {chrome.i18n.getMessage("Enable")}
                    </span>
                </label>
                <button id="optionsButton" 
                    className="sbControlsMenu-item" 
                    title={chrome.i18n.getMessage("Options")}
                    onClick={() => {
                        chrome.runtime.sendMessage({ "message": "openConfig" });
                    }}>
                <img src="/icons/settings.svg" alt="Settings icon" width="23" height="23" className="sbControlsMenu-itemIcon" id="sbPopupIconSettings" />
                    {chrome.i18n.getMessage("Options")}
                </button>
            </div>

            {/* Footer */}
            <footer id="sbFooter">
                <a id="helpButton"
                        onClick={() => {
                            chrome.runtime.sendMessage({ "message": "openHelp" });
                        }}>
                            {chrome.i18n.getMessage("help")}
                    </a>
                    <a href="https://sponsor.ajay.app" target="_blank" rel="noreferrer">
                        {chrome.i18n.getMessage("website")}
                    </a>
                    <a href="https://sponsor.ajay.app/donate" target="_blank" rel="noreferrer" className={!showDonationLink() ? " hidden" : ""} onClick={() => {
                        Config.config!.donateClicked = Config.config!.donateClicked + 1;
                    }}>
                        {chrome.i18n.getMessage("Donate")}
                    </a>
                    <br />
                    <a href="https://github.com/ajayyy/SponsorBlock" target="_blank" rel="noreferrer">
                        GitHub
                    </a>
                    <a href="https://discord.gg/SponsorBlock" target="_blank" rel="noreferrer">
                        Discord
                    </a>
                    <a href="https://matrix.to/#/#sponsor:ajay.app?via=ajay.app&via=matrix.org&via=mozilla.org" target="_blank" rel="noreferrer">
                        Matrix
                    </a>
            </footer>
        </>
    );
};