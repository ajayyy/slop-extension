import { PlacementPosition, SelectorPatternType, SiteInfo, SiteType } from "../utils/siteInfo.types";

const contentIdPattern = "/([^/]+/post/[^?/]+)";
const profileIdPattern = "/([^/]+)/post/";

export const BskySiteInfo: SiteInfo = {
    domains: ["bsky.app"],
    siteChecker: () => {
        return !!document.querySelector(`meta[name="generator"][content="bskyweb"]`);
    },
    type: SiteType.social,
    browsePageFinder: {
        elementCSSSelector: 'div[data-testid*="feedItem"], div[data-testid*="postThreadItem"]',
        elementTagNames: ["div"],
        contentId: [{
            type: SelectorPatternType.function,
            get: (_, element) => {
                const link = element.querySelector('a[href*="/post/"]') as HTMLLinkElement;

                if (link && link.href) {
                    return link.href.match(contentIdPattern)?.[1] || null;
                }

                return null;
            }
        }],
        profileId: [{
            type: SelectorPatternType.function,
            get: (_, element) => {
                const link = element.querySelector('a[href*="/post/"]') as HTMLLinkElement;

                if (link && link.href) {
                    return link.href.match(profileIdPattern)?.[1] || null;
                }

                return null;
            }
        }],
        buttonPlacements: [{
            selector: 'button[data-testid="postDropdownBtn"]',
            position: PlacementPosition.Before,
            parent: 2,
            manuallyAlignSubmissionBox: true,
            getColor: (element) => {
                const button = element.querySelector(`button[data-testid="postDropdownBtn"] svg`) as HTMLElement;
                if (button && button.style.color) {
                    return button.style.color;
                }

                return null;
            }
        }]
    }
};