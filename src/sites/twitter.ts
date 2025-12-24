import { PlacementPosition, SelectorPatternType, SiteInfo, SiteType } from "../utils/siteInfo.types";

const contentIdPattern = "/[^/]+/status/([0-9]+)";
const profileIdPattern = "/([^/]+)/status/";

//todo: how to handle username changes? or maybe that doesn't matter enough to try

export const TwitterSiteInfo: SiteInfo = {
    domains: ["x.com", "twitter.com"],
    type: SiteType.social,
    browsePageFinder: {
        elementCSSSelector: `article[data-testid="tweet"]`,
        elementTagNames: ["div"],
        contentId: [{
            type: SelectorPatternType.function,
            get: (_, element) => {
                const link = element.querySelector('a[href*="/status/"]') as HTMLLinkElement;

                if (link && link.href) {
                    return link.href.match(contentIdPattern)?.[1] || null;
                }

                return null;
            }
        }],
        profileId: [{
            type: SelectorPatternType.function,
            get: (_, element) => {
                const link = element.querySelector('a[href*="/status/"]') as HTMLLinkElement;

                if (link && link.href) {
                    return link.href.match(profileIdPattern)?.[1] || null;
                }

                return null;
            }
        }],
        buttonPlacements: [{
            selector: 'button[data-testid="caret"]',
            position: PlacementPosition.Before,
            parent: 4,
            manuallyAlignSubmissionBox: true,
            getColor: (element) => {
                const button = element.querySelector(`button[data-testid="caret"] div`) as HTMLElement;
                if (button && button.style.color) {
                    return button.style.color;
                }

                return null;
            }
        }]
    }
};