import { PlacementPosition, SelectorPatternType, SiteInfo, SiteType } from "../utils/siteInfo.types";

//todo: if the url is an external site, try to use the external site id instead of reddit (similar to a google search)
const contentIdPattern = "/comments/([0-9a-z]+)/";

export const RedditSiteInfo: SiteInfo = {
    // todo: support all old reddit domains need asterisk support
    domains: ["reddit.com", "old.reddit.com"],
    type: SiteType.social,
    browsePageFinder: {
        // new, old
        elementCSSSelector: `shreddit-post, [data-context="listing"]:not(.promotedlink)`,
        // Only needs to support new reddit for refreshing
        elementTagNames: ["article", "main"],
        contentId: [{
            type: SelectorPatternType.function,
            get: (_, element) => {
                const link = element.getAttribute("permalink") || element.getAttribute("data-permalink");
                if (link) {
                    return link.match(contentIdPattern)?.[1] || null;
                }

                return null;
            }
        }],
        profileId: [{
            type: SelectorPatternType.function,
            get: (_, element) => {
                const author = element.getAttribute("author") || element.getAttribute("data-author");
                if (author) {
                    return author.toLowerCase();
                }

                return null;
            }
        }],
        buttonPlacements: [{
            // Old reddit
            selector: `li[class="share"]`,
            position: PlacementPosition.After,
            parent: 1,
            getColor: (element) => {
                const button = element.querySelector(`a.reportbtn`) as HTMLElement;
                if (button) {
                    return window.getComputedStyle(button).color;
                }

                return null;
            },
        }, {
            // New reddit
            selector: "shreddit-post-share-button",
            position: PlacementPosition.Before,
            relativeElementSelector: ".ms-auto.flex.flex-row",
            parent: 2,
            shadowRoot: true,
            wait: true,
            getColor: () => {
                return "var(--color-button-secondary-text)";
            },
            postProcessor: (e, button) => {
                button.style.zIndex = "1000";

                if (e.shadowRoot) {
                    const style = document.createElement("link");
                    style.rel = "stylesheet";
                    style.href = chrome.runtime?.getURL("content.css");

                    e.shadowRoot.prepend(style);
                }
            }
        }]
    }
};