import { waitFor } from "../../maze-utils/src";
import { BlogSiteInfo } from "../sites/blog";
import { BskySiteInfo } from "../sites/bsky";
import { MastodonSiteInfo } from "../sites/mastodon";
import { RedditSiteInfo } from "../sites/reddit";
import { TikTokSiteInfo } from "../sites/tiktok";
import { TwitterSiteInfo } from "../sites/twitter";
import { YouTubeSiteInfo } from "../sites/youtube";
import { ButtonPlacement, ButtonPlacementResult, SelectorPattern, SelectorPatternType, SiteInfo, SiteSelectors, SocialSelectors } from "./siteInfo.types";

//todo: define a way to catch when new elements are created/updated
//      maybe just onscroll?

const siteInfoList: SiteInfo[] = [
    YouTubeSiteInfo,
    MastodonSiteInfo,
    BskySiteInfo,
    TwitterSiteInfo,
    TikTokSiteInfo,
    RedditSiteInfo,
    BlogSiteInfo
];

function getDomain(url: { hostname: string }): string {
    const hostname = url.hostname;
    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

function getCurrentDomain(): string {
    return getDomain(window.location);
}

export async function executeSelectorPattern(element: HTMLElement, pattern: SelectorPattern, url: URL): Promise<string | null> {
    switch (pattern.type) {
        case SelectorPatternType.urlParameter: {
            const urlParams = new URLSearchParams(url.search);
            return urlParams.get(pattern.param);
        }
        case SelectorPatternType.pathIndex: {
            const pathSegments = url.pathname.split("/");
            return pathSegments[pattern.index] || null;
        }
        case SelectorPatternType.pathRegex: {
            const match = url.pathname.match(pattern.selector);
            return match ? match[1] : null;
        }
        case SelectorPatternType.hrefRegex: {
            const match = url.href.match(pattern.selector);
            return match ? match[1] : null;
        }
        case SelectorPatternType.cssSelector: {
            const selectedElement = element.querySelector(pattern.selector) as HTMLLinkElement;
            let result: string | null = null;
            if (selectedElement) {
                if (pattern.attribute) {
                    result = selectedElement.getAttribute(pattern.attribute);
                } else {
                    result = selectedElement.textContent;
                }
            }

            if (result && pattern.postProcessor) {
                result = pattern.postProcessor(result);
            }

            return result;
        }
        case SelectorPatternType.function: {
            return pattern.get(url, element);
        }
        case SelectorPatternType.asyncFunction: {
            return await pattern.get(url, element);
        }
    }
}

export function getSiteInfo(): SiteInfo | null {
    const domain = getCurrentDomain();

    for (const siteInfo of siteInfoList) {
        if (siteInfo.domains.includes(domain)
            || (siteInfo.siteChecker && siteInfo.siteChecker(window.location.href))) {
            return siteInfo;
        }
    }

    return null;
}

export async function getCurrentID(url: URL): Promise<string | null> {
    const siteInfo = getSiteInfo();
    if (!siteInfo || (!("selectors" in siteInfo))) return null;

    return await getContentID(getCurrentElement(), siteInfo, siteInfo.selectors, url);
}

export async function getCurrentProfileID(url: URL): Promise<string | null> {
    const siteInfo = getSiteInfo();
    if (!siteInfo || siteInfo.type !== "social" || (!("selectors" in siteInfo))) return null;

    return await runAllSelectors(getCurrentElement(), siteInfo.selectors.profileId, url);
}

export function getCurrentElement(): HTMLElement {
    const siteInfo = getSiteInfo();
    if (!siteInfo || (!("selectors" in siteInfo))) {
        return document.documentElement;
    }

    if (siteInfo.selectors.elementCSSSelector) {
        const element = document.querySelector(siteInfo.selectors.elementCSSSelector) as HTMLElement;
        if (element) {
            return element;
        }
    }

    return document.documentElement;
}


export async function getContentID(element: HTMLElement, siteInfo: SiteInfo, selectors: SiteSelectors, url: URL): Promise<string | null> {
    const result = await runAllSelectors(element, selectors.contentId, url);
    if (result) {
        return `${siteInfo.idPrefix ?? getDomain(url)}-${result}`
    } else {
        return null;
    }
}

export function getProfileID(element: HTMLElement, selectors: SocialSelectors, url: URL): Promise<string | null> {
    return runAllSelectors(element, selectors.profileId, url);
}

export async function runAllSelectors(element: HTMLElement, patterns: SelectorPattern[], url: URL): Promise<string | null> {
    for (const pattern of patterns) {
        const result = await executeSelectorPattern(element, pattern, url);

        if (result) {
            return result;
        }
    }

    return null;
}

export function findButtonParent(buttonPlacements: ButtonPlacement[], element: HTMLElement): Promise<ButtonPlacementResult | null> {
    let found = false;
    try {
        return Promise.any(buttonPlacements.map(async (placement) => {
            let baseElement: HTMLElement | ShadowRoot | null = element;
            if (placement.shadowRoot) {
                baseElement = element.shadowRoot || await waitFor(() => element.shadowRoot);
                if (baseElement === null) throw Error("No base element");
            }

            const getElem = () => "selector" in placement
                ? baseElement!.querySelector(placement.selector)
                : placement.getElement(baseElement as HTMLElement);

            let selectedElement = placement.wait
                ? await waitFor(() => getElem())
                : getElem();

            // If another already found, use the first one
            if (found) throw Error("Already found, give up");
            found = true;

            if (selectedElement) {
                for (let i = 0; i < (placement.parent || 0); i++) {
                    if (selectedElement.parentElement) {
                        selectedElement = selectedElement.parentElement;
                    }
                }

                if (selectedElement) {
                    return {
                        element: selectedElement as HTMLElement,
                        position: placement.position,
                        relativeElementSelector: placement.relativeElementSelector,
                        manuallyAlignSubmissionBox: placement.manuallyAlignSubmissionBox,
                        alignSubmissionBoxWithElement: placement.alignSubmissionBoxWithElement,
                        getColor: placement.getColor,
                        postProcessor: placement.postProcessor
                    };
                }
            }

            throw Error("No selected element");
        }));
    } catch (e) {
        return Promise.resolve(null);
    }
}