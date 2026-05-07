import { waitFor } from "../../maze-utils/src";
import { addCleanupListener } from "../../maze-utils/src/cleanup";
import Config from "../config/config";
import { ReportButton } from "../ui/reportButton";
import { getSubmissions, isAIVote, isNegativeVote, SubmissionData } from "./dataFetching";
import { log, logError } from "./logger";
import { findButtonParent, getContentID, getCurrentID, getProfileID, getSiteInfo } from "./siteInfo";
import { BlogSiteInfoBase, SiteInfo, SiteSelectors, SocialSelectors } from "./siteInfo.types";

interface CreatedButton {
    element: HTMLElement;
    reportButton: ReportButton | null;
}

let siteInfo: SiteInfo | null = getSiteInfo();
setTimeout(() => {
    // HTML isn't loaded yet on first load
    if (!siteInfo) {
        siteInfo = getSiteInfo();
    }
}, 1)
const createdButtons: CreatedButton[] = [];

let elementMutationObserver: MutationObserver | null = null;

export function initSiteHandler() {
    if (siteInfo) {
        if (siteInfo.browsePageFinder) {
            const elements = Array.from(document.querySelectorAll(siteInfo.browsePageFinder.elementCSSSelector));
            for (const element of elements) {
                onPostFound(element as HTMLElement, siteInfo.browsePageFinder).catch(logError);
            }

            if (!siteInfo.browsePageFinder.dontListenForNewElements) {
                elementMutationObserver = new MutationObserver(onMutation);
                elementMutationObserver.observe(document.documentElement, { childList: true, subtree: true });
            }
        }

        pageUrlChanged().catch(logError);
        setupOnUrlChange();
    }
}

async function pageUrlChanged() {
    if (siteInfo && "selectors" in siteInfo) {
        const nextId = await getCurrentID();

        const getElem = () => document.querySelector((siteInfo as BlogSiteInfoBase).selectors.elementCSSSelector);
        const element = siteInfo.selectors.wait
            ? await waitFor(() => getElem())
            : getElem();
        if (element && nextId) {
            await onPostFound(element as HTMLElement, siteInfo.selectors);
        }
    }
}

function onMutation(mutations: MutationRecord[]) {
    if (!siteInfo || !siteInfo.browsePageFinder) return;

    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement) {
                if (siteInfo.browsePageFinder.elementTagNames && !siteInfo.browsePageFinder.elementTagNames.includes(node.tagName.toLowerCase())) {
                    // Exit early, not this element
                    continue;
                }

                const elements = node.matches(siteInfo.browsePageFinder.elementCSSSelector)
                    ? [node]
                    : node.querySelectorAll(siteInfo.browsePageFinder.elementCSSSelector) as NodeListOf<HTMLElement>;
                if (elements.length > 0) {
                    for (const element of elements) {
                        for (const button of createdButtons) {
                            // todo: might have to trigger a refresh of displayed information at this point
                            if (button.element === element) continue;
                        }

                        onPostFound(element, siteInfo.browsePageFinder).catch(logError);
                    }
                }
            }
        }
    }
}

async function onPostFound(element: HTMLElement, selectors: SiteSelectors | SocialSelectors) {
    const contentID = await getContentID(element, selectors);
    const profileID = "profileId" in selectors ? await getProfileID(element, selectors) : null;

    let createdButton = createdButtons.find(b => b.element === element);
    if (!createdButton) {
        createdButton = {
            element,
            reportButton: null
        };

        createdButtons.push(createdButton);
    }

    const existingVotesPromise = contentID ? getSubmissions(contentID, profileID) : Promise.resolve([]);
    createdButton?.reportButton?.setContentID(null, null);

    findButtonParent(selectors.buttonPlacements, element).then((buttonParent) => {
        if (buttonParent) {
            const reportButton = createdButton?.reportButton ?? new ReportButton(element, buttonParent);
            reportButton.attachToPage();

            if (document.readyState !== "complete") {
                window.addEventListener("load", () => {
                    reportButton.attachToPage();
                    setTimeout(() => reportButton.attachToPage(), 5000);
                });
            }

            existingVotesPromise.then((existingVotes) => reportButton!.setExistingVotes(existingVotes)).catch(logError);
            reportButton!.setContentID(contentID, profileID);

            for (const createdButton of createdButtons) {
                if (createdButton.element === element) {
                    createdButton.reportButton = reportButton;
                    break;
                }
            }
        }
    }).catch(() => {
        log("Failed to find button parent", contentID);
    });

    if (contentID) {
        existingVotesPromise.then((existingVotes) => {
            tintPost(element, existingVotes);
        }).catch(logError);
    }
}

function tintPost(element: HTMLElement, existingVotes: SubmissionData) {
    //todo: treat "all human" votes as downvotes
    //todo: handle profile votes in some way
    for (const vote of existingVotes.content.sort((a, b) => (b.votes) - (a.votes))) {
        const votes = vote.votes;
        if (votes > 0) {
            if (isAIVote(vote)) {
                //todo: combine multiple ai votes to get poweer of tint (average?)
                // const sumOfAiVotes = existingVotes.reduce((sum, v) => isAIVote(v) ? sum + (v.upvotes - v.downvotes) : sum, 0);
                //todo: use that
                console.log(votes, Math.sqrt(votes));
                element.setAttribute("slTintedPost", "1");
                element.style.setProperty("--slTintedPostOpacity", String(Math.min(0.4, 0.08 * Math.sqrt(votes))));
                return;
            } else if (isNegativeVote(vote)) {
                //todo: use different color
                element.setAttribute("slTintedPost", "1");
                element.style.setProperty("--slTintedPostOpacity", String(Math.min(0.4, 0.08 * Math.sqrt(votes))));
                return;
            }
        }
    }

    element.removeAttribute("slTintedPost");
}

export function closeAllButtons(skippedButton?: ReportButton) {
    for (const createdButton of createdButtons) {
        if (createdButton.reportButton && createdButton.reportButton !== skippedButton) {
            createdButton.reportButton.close();
        }
    }
}

function setupOnUrlChange() {
    // Register listener for URL change via Navigation API
    const navigationApiAvailable = "navigation" in window;
    const navigationListener = () => void (pageUrlChanged().catch(logError));
    if (navigationApiAvailable) {
        (window as unknown as { navigation: EventTarget }).navigation.addEventListener("navigate", navigationListener);

        addCleanupListener(() => {
            (window as unknown as { navigation: EventTarget }).navigation.removeEventListener("navigate", navigationListener);
        });
    } else {
        chrome.runtime.onMessage.addListener((request) => {
            if (request.message === "update") {
                pageUrlChanged().catch(logError);
            }
        });
    }

    if (siteInfo && "selectors" in siteInfo && siteInfo.selectors.refreshEvents) {
        for (const eventName of siteInfo.selectors.refreshEvents) {
            document.addEventListener(eventName, navigationListener);
        }
    }

    // Record availability of Navigation API
    void waitFor(() => Config.local !== null).then(() => {
        if (Config.local!.navigationApiAvailable !== navigationApiAvailable) {
            Config.local!.navigationApiAvailable = navigationApiAvailable;
            Config.forceLocalUpdate("navigationApiAvailable");
        }
    });
}