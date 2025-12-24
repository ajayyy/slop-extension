import { isVisible } from "../../maze-utils/src/dom";
import { PlacementPosition, SelectorPatternType, SiteInfo, SiteType } from "../utils/siteInfo.types";

export const BlogSiteInfo: SiteInfo = {
    domains: [],
    siteChecker: () => {
        // Fallback
        return true;
    },
    type: SiteType.blog,
    selectors: {
        contentId: [{
            type: SelectorPatternType.cssSelector,
            selector: `link[rel="canonical"]`,
            attribute: "href"
        }, {
            type: SelectorPatternType.cssSelector,
            selector: `meta[property="og:url"]`,
            attribute: "content"
        }, {
            type: SelectorPatternType.function,
            get: () => {
                //todo: add fallback to url with basic analytics params stripped
                return window.location.href;
            }
        }],
        buttonPlacements: [{
            getElement: () => {
                const pageTitle = document.title;
                const selectorsToTry = [
                    "h1",
                    "h2",
                    "h3"
                ];
                for (const selector of selectorsToTry) {
                    const headingElements = document.querySelectorAll(selector);
                    for (const headingElement of headingElements) {
                        if (headingElement.textContent && 
                                (headingElement.textContent === pageTitle
                                || headingElement.textContent.startsWith(pageTitle.replace(/ [-|—] .+$/, ""))
                                || headingElement.textContent.startsWith(pageTitle.replace(/^.+(: | [-|—] )/, "")))) {
                            return headingElement as HTMLElement;
                        }
                    }
                }

                // Try whatever the header is if none match title
                const mainHeader = document.querySelector("h1");
                if (mainHeader && isVisible(mainHeader)) {
                    return mainHeader as HTMLElement;
                }

                return null;
            },
            position: PlacementPosition.After,
            manuallyAlignSubmissionBox: true,
            getColor: (_, button) => {
                const style = window.getComputedStyle(button.parentElement!);
                if (style.color) {
                    return style.color;
                }

                return null;
            },
            postProcessor: (_, button) => {
                button.style.verticalAlign = "baseline";
            }
        }],
        elementCSSSelector: `*`, //todo: maybe don't highlight main page? or only title?
    },
    browsePageFinder: {
        elementCSSSelector: 'a[href^="/"]',
        // elementTagNames: ["div"],
        contentId: [{
            type: SelectorPatternType.function,
            get: (_, element) => {
                if (element && element.hasAttribute("href")) {
                    return element.getAttribute("href")!;
                }

                return null;
            }
        }],
        buttonPlacements: []
        // buttonPlacements: [{
        //     selector: 'button[data-testid="postDropdownBtn"]',
        //     position: PlacementPosition.Before,
        //     parent: 2,
        //     manuallyAlignSubmissionBox: true,
        //     getColor: (element) => {
        //         const button = element.querySelector(`button[data-testid="postDropdownBtn"] svg`) as HTMLElement;
        //         if (button && button.style.color) {
        //             return button.style.color;
        //         }

        //         return null;
        //     }
        // }]
    }
};