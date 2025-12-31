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

function getCurrentDomain(): string {
    const hostname = window.location.hostname;
    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

export async function executeSelectorPattern(element: HTMLElement, pattern: SelectorPattern): Promise<string | null> {
    switch (pattern.type) {
        case SelectorPatternType.urlParameter: {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(pattern.param);
        }
        case SelectorPatternType.pathIndex: {
            const pathSegments = window.location.pathname.split("/");
            return pathSegments[pattern.index] || null;
        }
        case SelectorPatternType.pathRegex: {
            const match = window.location.pathname.match(pattern.selector);
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
            return pattern.get(window.location.href, element);
        }
        case SelectorPatternType.asyncFunction: {
            return await pattern.get(window.location.href, element);
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

export async function getCurrentID(): Promise<string | null> {
    const siteInfo = getSiteInfo();
    if (!siteInfo || (!("selectors" in siteInfo))) return null;

    return await runAllSelectors(getCurrentElement(), siteInfo.selectors.contentId);
}

export async function getCurrentProfileID(): Promise<string | null> {
    const siteInfo = getSiteInfo();
    if (!siteInfo || siteInfo.type !== "social" || (!("selectors" in siteInfo))) return null;

    return await runAllSelectors(getCurrentElement(), siteInfo.selectors.profileId);
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


export function getContentID(element: HTMLElement, selectors: SiteSelectors): Promise<string | null> {
    return runAllSelectors(element, selectors.contentId);
}

export function getProfileID(element: HTMLElement, selectors: SocialSelectors): Promise<string | null> {
    return runAllSelectors(element, selectors.profileId);
}

export async function runAllSelectors(element: HTMLElement, patterns: SelectorPattern[]): Promise<string | null> {
    for (const pattern of patterns) {
        const result = await executeSelectorPattern(element, pattern);
        
        if (result) {
            return result;
        }
    }
    
    return null;
}

export async function findButtonParent(buttonPlacements: ButtonPlacement[], element: HTMLElement): Promise<ButtonPlacementResult | null> {
    for (const placement of buttonPlacements) {
        let baseElement: HTMLElement | ShadowRoot | null = element;
        if (placement.shadowRoot) {
            baseElement = element.shadowRoot || await waitFor(() => element.shadowRoot);
            if (baseElement === null) continue;
        }

        const getElem = () => "selector" in placement
            ? baseElement!.querySelector(placement.selector)
            : placement.getElement(baseElement as HTMLElement);

        let selectedElement = placement.wait
            ? await waitFor(() => getElem())
            : getElem();
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
    }

    return null;
}