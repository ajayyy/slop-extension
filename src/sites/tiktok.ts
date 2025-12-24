import { PlacementPosition, SelectorPatternType, SiteInfo, SiteType } from "../utils/siteInfo.types";

const contentIdPattern = "/([^/]+/video/[0-9]+)";
const profileIdPattern = "/([^/]+)/video/";

export const TikTokSiteInfo: SiteInfo = {
    domains: ["tiktok.com"],
    type: SiteType.social,
    selectors: {
        contentId: [{
            type: SelectorPatternType.pathRegex,
            selector: contentIdPattern
        }],
        profileId: [{
            type: SelectorPatternType.pathRegex,
            selector: profileIdPattern
        }],
        buttonPlacements: [{
            selector: '[data-e2e="browse-like-icon"]',
            position: PlacementPosition.After,
            parent: 2,
            manuallyAlignSubmissionBox: true,
            alignSubmissionBoxWithElement: true,
            getColor: (element) => {
                const button = element.querySelector(`[data-e2e="browse-like-icon"] svg`) as HTMLElement;
                if (button && button.getAttribute("fill")) {
                    return button.getAttribute("fill");
                }

                return null;
            }
        }],
        elementCSSSelector: `[class*="DivProfileWrapper"]`,
    },
    browsePageFinder: {
        elementCSSSelector: `a[href*="/video/"]`,
        elementTagNames: ["div"],
        contentId: [{
            type: SelectorPatternType.function,
            get: (_, element) => {
                if (element.getAttribute("href")) {
                    return element.getAttribute("href")!.match(contentIdPattern)?.[1] || null;
                }

                return null;
            }
        }],
        profileId: [{
            type: SelectorPatternType.function,
            get: (_, element) => {
                if (element.getAttribute("href")) {
                    return element.getAttribute("href")!.match(profileIdPattern)?.[1] || null;
                }

                return null;
            }
        }],
        buttonPlacements: [{
            selector: '[class*="DivCardFooter"]',
            position: PlacementPosition.After,
            wait: true,
            parent: 0,
            manuallyAlignSubmissionBox: true,
            postProcessor: (e, button) => {
                button.style.zIndex = "1000";
            }
        }]
    }
};