import { getStoredData } from "../utils/fetchDataStore";
import { SelectorPatternType, SiteInfo, SiteType } from "../utils/siteInfo.types";

export const MastodonSiteInfo: SiteInfo = {
    domains: [],
    siteChecker: () => {
        return !!document.querySelector("#mastodon.app-holder");
    },
    type: SiteType.social,
    selectors: {
        contentId: [{
            type: SelectorPatternType.function,
            get: () => {
                const currentId = document.URL.match(/\/@.[^/]*\/([^/]+)/)?.[1];
                if (!currentId) return null;
                
                const storedData = getStoredData();
                for (const item of storedData) {
                    if (item.url.match(`/statuses/${currentId}`)) {
                        if (item.data && item.data.id === currentId) {
                            return item.data.uri;
                        }
                    }
                }
    
                return null;
            }
        }],
        profileId: [{
            type: SelectorPatternType.function,
            get: () => {
                const username = document.URL.match(/\/(@.[^/]*)\//)?.[1];
                if (username) {
                    if (username.match(/^@[^@]+@.+/)) {
                        return username;
                    } else {
                        return `${username}@${window.location.hostname}`;
                    }
                }
    
                return null
            }
        }],
        buttonPlacements: [],
        elementCSSSelector: "article"
    },
    browsePageFinder: {
        elementCSSSelector: "article",
        elementTagNames: ["article"],
        contentId: [{
            type: SelectorPatternType.function,
            get: (_, element) => {
                const idLink = element.querySelector("a.status__relative-time, a.detailed-status__datetime") as HTMLLinkElement;
                if (!idLink) return null;

                const currentId = idLink.href.match(/\/@.[^/]*\/([^/]+)/)?.[1];
                if (!currentId) return null;
                
                const storedData = getStoredData();
                for (const item of storedData) {
                    if (item.url.match(`/statuses/${currentId}`)) {
                        if (item.data && item.data.id === currentId) {
                            return item.data.uri;
                        }
                    }
                }

                return null;
            }
        }],
        profileId: [{
            type: SelectorPatternType.function,
            get: (_, element) => {
                const idLink = element.querySelector("a.status__relative-time, a.detailed-status__datetime") as HTMLLinkElement;
                if (!idLink) return null;

                const username = idLink.href.match(/\/(@.[^/]*)\//)?.[1];
                if (username) {
                    if (username.match(/^@[^@]+@.+/)) {
                        return username;
                    } else {
                        return `${username}@${window.location.hostname}`;
                    }
                }

                return null
            }
        }],
        //todo: add button placements
        buttonPlacements: []
    }
};