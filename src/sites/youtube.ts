import { getChannelID } from "../../maze-utils/src/metadataFetcher";
import { brandingBoxSelector } from "../../maze-utils/src/thumbnail-selectors";
import { VideoID } from "../../maze-utils/src/video";
import { executeSelectorPattern } from "../utils/siteInfo";
import { PlacementPosition, SelectorPattern, SelectorPatternType, SiteInfo, SiteType } from "../utils/siteInfo.types";

const contentIdRegex = "(?:/shorts/|/embed/|/live/|/watch\\?v=)([^/]{11})";

const contentIdPattern: SelectorPattern = {
    type: SelectorPatternType.cssSelector,
    attribute: "href",
    selector: `a[href*="watch?v="]`,
    postProcessor: (value: string) => {
        console.log(value)
        return value.match(contentIdRegex)?.[1] || "";
    }
};

export const YouTubeSiteInfo: SiteInfo = {
    domains: ["youtube.com", "youtube-nocookie.com"],
    type: SiteType.social,
    selectors: {
        contentId: [{
            type: SelectorPatternType.pathRegex,
            selector: contentIdRegex
        }],
        profileId: [{
            type: SelectorPatternType.asyncFunction,
            get: getProfileIDByUrl
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
        contentId: [contentIdPattern],
        profileId: [{
            type: SelectorPatternType.asyncFunction,
            get: getProfileID
        }],
        buttonPlacements: []
    }
};

async function getProfileID(url: string, element: HTMLElement): Promise<string | null> {
    const videoID = await executeSelectorPattern(element, contentIdPattern) as VideoID | null;
    if (videoID) {
        const channelInfo = await getChannelID(videoID);
        return channelInfo?.channelID || null;
    }

    return null;
}

async function getProfileIDByUrl(url: string): Promise<string | null> {
    const videoID = url.match(contentIdRegex)?.[1] as VideoID | null;
    if (videoID) {
        const channelInfo = await getChannelID(videoID);
        return channelInfo?.channelID || null;
    }

    return null;
}