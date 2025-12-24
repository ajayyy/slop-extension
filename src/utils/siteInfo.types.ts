export enum SiteType {
    blog = "blog",
    social = "social"
}

export enum SelectorPatternType {
    urlParameter = "url",
    pathIndex = "path",
    pathRegex = "pathRegex",
    cssSelector = "css",
    function = "function"
}

export type SelectorPattern = {
    type: SelectorPatternType.urlParameter;
    param: string;
} | {
    type: SelectorPatternType.pathIndex;
    index: number;
} | {
    type: SelectorPatternType.pathRegex;
    selector: string;
} | {
    type: SelectorPatternType.cssSelector;
    selector: string;
    attribute?: string;
} | {
    type: SelectorPatternType.function;
    get: (url: string, element: HTMLElement) => string | null;
};

export enum PlacementPosition {
    Before,
    After
}

export type ButtonPlacement = ({
    selector: string;
} | {
    getElement: (element: HTMLElement) => HTMLElement | null;
}) & {
    position: PlacementPosition;
    parent?: number; // How many levels up
    relativeElementSelector?: string; // Selector to place next to
    wait?: boolean;
    shadowRoot?: boolean;
    manuallyAlignSubmissionBox?: boolean;
    alignSubmissionBoxWithElement?: boolean; // Align with element instead of button
    getColor?: (element: HTMLElement, buttonElement: HTMLElement) => string | null;
    postProcessor?: (element: HTMLElement, buttonElement: HTMLElement) => void;
};

export interface ButtonPlacementResult {
    element: HTMLElement;
    position: PlacementPosition;
    relativeElementSelector?: string;
    manuallyAlignSubmissionBox?: boolean;
    alignSubmissionBoxWithElement?: boolean;
    getColor?: (element: HTMLElement, buttonElement: HTMLElement) => string | null;
    postProcessor?: (element: HTMLElement, buttonElement: HTMLElement) => void;
}

export interface SiteSelectors {
    contentId: SelectorPattern[];
    buttonPlacements: ButtonPlacement[];
    elementCSSSelector: string;
    wait?: boolean;
    refreshEvents?: string[];
}

export interface SocialSelectors extends SiteSelectors {
    profileId: SelectorPattern[];
}

interface BaseBrowsePageFinder {
    // Tag name of the parent elements that will be added to the page
    elementTagNames?: string[];
    dontListenForNewElements?: boolean;
}

export type BrowsePageFinder = BaseBrowsePageFinder & SiteSelectors;
export type SocialBrowsePageFinder = BaseBrowsePageFinder & SocialSelectors;

export interface SiteInfoBase {
    domains: (string)[];
    siteChecker?: (url: string) => boolean;
    type: SiteType;
}

export interface SocialSiteInfoBase {
    type: SiteType.social;
    browsePageFinder?: SocialBrowsePageFinder;
}

export interface BlogSiteInfoBase {
    browsePageFinder?: BrowsePageFinder;
    selectors: SiteSelectors;
    type: SiteType.blog;
}

export type SiteInfo = SiteInfoBase & (BlogSiteInfoBase | SocialSiteInfoBase
  | (SocialSiteInfoBase & {
    selectors: SocialSelectors;
}));