import * as React from "react";
import { createRoot } from 'react-dom/client';
import { LabelOptionsComponent } from "./LabelOptionsComponent";

class LabelOptions {

    constructor(element: Element) {
        const root = createRoot(element);
        root.render(
            <LabelOptionsComponent />
        );
    }
}

export default LabelOptions;