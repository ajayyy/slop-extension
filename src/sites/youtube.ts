import { PlacementPosition, SelectorPatternType, SiteInfo, SiteType } from "../utils/siteInfo.types";

export const YouTubeSiteInfo: SiteInfo = {
    domains: ["youtube.com", "youtube-nocookie.com"],
    type: SiteType.social,
    selectors: {
        contentId: [{
            type: SelectorPatternType.urlParameter,
            param: "v"
        }, {
            type: SelectorPatternType.pathRegex,
            selector: "(/shorts/|/embed/)([^/]{11})$"
        }],
        profileId: [{
            type: SelectorPatternType.function,
            get: (url: string) => {
                //todo: get it from maze utils
                return url;
            }
        }],
        buttonPlacements: [{
            selector: '#top-level-buttons-computed',
            position: PlacementPosition.Before,
            parent: 0,
            manuallyAlignSubmissionBox: true,
        }],
        elementCSSSelector: "#above-the-fold",
    },
    browsePageFinder: {
        //todo: use maze utils
        elementCSSSelector: "ytd-grid-video-renderer, ytd-video-renderer",
        contentId: [{
            type: SelectorPatternType.cssSelector,
            attribute: "href",
            selector: "a#video-title" //todo: use maze utils
        }],
        profileId: [{
            type: SelectorPatternType.cssSelector,
            attribute: "href",
            selector: "a#channel-name" //todo: use maze utils
        }],
        //todo: add button placements
        buttonPlacements: []
    }
};