import { brandingBoxSelector } from "../../maze-utils/src/thumbnail-selectors";
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
            selector: "(?:/shorts/|/embed/|/live/)([^/]{11})$"
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
            wait: true
        }],
        elementCSSSelector: "ytd-watch-metadata",
        wait: true
    },
    browsePageFinder: {
        elementCSSSelector: brandingBoxSelector,
        contentId: [{
            type: SelectorPatternType.cssSelector,
            attribute: "href",
            selector: `a[href*="watch?v="]`
        }],
        profileId: [{
            type: SelectorPatternType.cssSelector,
            attribute: "href",
            selector: "a#channel-name" //todo: use maze utils
        }],
        buttonPlacements: []
    }
};