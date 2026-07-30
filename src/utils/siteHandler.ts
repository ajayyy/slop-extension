import { waitFor } from "../../maze-utils/src";
import { addCleanupListener } from "../../maze-utils/src/cleanup";
import Config, { Category, LabelAction } from "../config/config";
import { ReportButton } from "../ui/reportButton";
import { getSubmissions, isAIVote, SubmissionData } from "./dataFetching";
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
                onPostFound(element as HTMLElement, siteInfo, siteInfo.browsePageFinder, ).catch(logError);
            }

            if (!siteInfo.browsePageFinder.dontListenForNewElements) {
                elementMutationObserver = new MutationObserver(onMutation);
                elementMutationObserver.observe(document.documentElement, { childList: true, subtree: true });
            }
        }

        pageUrlChanged(new URL(window.location.href)).catch(logError);
        setupOnUrlChange();
    }
}

async function pageUrlChanged(url: URL) {
    if (siteInfo && "selectors" in siteInfo) {
        const nextId = await getCurrentID(url);

        const getElem = () => document.querySelector((siteInfo as BlogSiteInfoBase).selectors.elementCSSSelector);
        const element = siteInfo.selectors.wait
            ? await waitFor(() => getElem())
            : getElem();
        if (element && nextId) {
            await onPostFound(element as HTMLElement, siteInfo, siteInfo.selectors);
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

                        onPostFound(element, siteInfo, siteInfo.browsePageFinder).catch(logError);
                    }
                }
            }
        }
    }
}

async function onPostFound(element: HTMLElement, siteInfo: SiteInfo, selectors: SiteSelectors | SocialSelectors) {
    const url = new URL(window.location.href);
    const contentID = await getContentID(element, siteInfo, selectors, url);
    const profileID = "profileId" in selectors ? await getProfileID(element, selectors, url) : null;

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
            actionOnPost(element, existingVotes);
        }).catch(logError);
    }
}

interface LabelColor {
    color: string;
    count: number;
}

function actionOnPost(element: HTMLElement, existingVotes: SubmissionData) {
    // Normalize votes by removing all human votes
    const humanVotes = existingVotes.content.find((v) => v.id === "human")?.votes;
    if (humanVotes && humanVotes > 0) {
        for (const vote of existingVotes.content) {
            if (isAIVote(vote)) {
                vote.votes -= humanVotes;
            }
        }
    }

    //todo: handle profile votes in some way
    const labelColors: LabelColor[] = [];
    const barColors: LabelColor[] = [];
    for (const group of Config.config!.labelConfig) {
        if ([LabelAction.Color, LabelAction.Bar].includes(group.action)) {
            const validVotes = existingVotes.content.filter((v) => v.votes > 0 && group.categories.includes(v.id as Category));
            if (validVotes.length > 0) {
                const averageVotes = validVotes.reduce((acc, v) => v.votes + acc, 0) / validVotes.length;

                if (group.action === LabelAction.Color) {
                    labelColors.push({
                        color: group.color,
                        count: averageVotes
                    });
                } else if (group.action === LabelAction.Bar) {
                    barColors.push({
                        color: group.color,
                        count: averageVotes
                    });
                }
            }
        }
    }

    // Color label
    if (labelColors.length > 0) {
        const totalLabelCount = labelColors.reduce((acc, l) => acc + l.count, 0);
        let labelCursor = 0;
        let filter = "linear-gradient(90deg";
        const defaultGradientSize = 0.05;

        for (const labelColor of labelColors) {
            const tooSmallForGradient = (labelColor.count / totalLabelCount) < defaultGradientSize * 2;
            const gradientSize = tooSmallForGradient ? 0 : defaultGradientSize;
            const currentPercent = labelCursor / totalLabelCount + gradientSize;
            const nextPercentage = (labelCursor + labelColor.count) / totalLabelCount - gradientSize;

            const brightness = Math.round((Math.max(0, Math.min(1, labelColor.count / Config.config!.votesForMaxBrightness)) * 255)).toString(16);
            filter += `,${labelColor.color}${brightness} ${currentPercent * 100}% ${(nextPercentage) * 100}%`;

            labelCursor += labelColor.count;
        }

        element.setAttribute("slTintedPost", "1");
        element.style.setProperty("--slTintedPostFilter", filter);
    } else {
        element.removeAttribute("slTintedPost");
    }

    // Color bar
    if (barColors.length > 0) {
        const totalCount = barColors.reduce((acc, l) => acc + l.count, 0);
        let labelCursor = 0;
        let filter = "linear-gradient(90deg";

        for (const color of barColors) {
            const currentPercent = labelCursor / totalCount;
            const nextPercentage = (labelCursor + color.count) / totalCount;

            const brightness = (Math.max(0, Math.min(1, color.count / Config.config!.votesForMaxBrightness)) * 255).toString(16);
            filter += `,${color.color}${brightness} ${currentPercent * 100}% ${(nextPercentage) * 100}%`;

            labelCursor += color.count;
        }

        element.setAttribute("slColorBarPost", "1");
        element.style.setProperty("--slColorBarFilter", filter);
    } else {
        element.removeAttribute("slColorBarPost");
    }
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
    const navigationListener = (e) => void (pageUrlChanged(new URL(e.destination.url)).catch(logError));
    if (navigationApiAvailable) {
        (window as unknown as { navigation: EventTarget }).navigation.addEventListener("navigate", navigationListener);

        addCleanupListener(() => {
            (window as unknown as { navigation: EventTarget }).navigation.removeEventListener("navigate", navigationListener);
        });
    } else {
        chrome.runtime.onMessage.addListener((request) => {
            if (request.message === "update") {
                pageUrlChanged(new URL(window.location.href)).catch(logError);
            }
        });
    }

    if (siteInfo && "selectors" in siteInfo && siteInfo.selectors.refreshEvents) {
        for (const eventName of siteInfo.selectors.refreshEvents) {
            document.addEventListener(eventName, navigationListener);
        }
    }

    // Record availability of Navigation API
    chrome.storage.local.get("navigationApiAvailable", (v) => {
        if (v.navigationApiAvailable !== navigationApiAvailable) {
            void chrome.storage.local.set({
                navigationApiAvailable
            });
        }
    });
}