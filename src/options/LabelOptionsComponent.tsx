import * as React from "react";
import Config, { Category, LabelAction, LabelConfig } from "../config/config";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { Feedback } from "@dnd-kit/dom"
import { CollisionPriority, UniqueIdentifier } from "@dnd-kit/abstract";
import DragIcon from "../svgIcons/dragIcon";
import { move } from "@dnd-kit/helpers";

const validOptions = [
    Category.AIScript,
    Category.AIMusic,
    Category.AIThumbnail,
    Category.AIGraphicsMost,
    Category.AIGraphicsLimited,
    Category.AIGraphicsCommentary,
    Category.Scam,
    Category.TTSMostlyTTS,
    Category.TTSMostlyHuman,
    Category.TTSAI,
    Category.AITopicNoExamples,
    Category.AITopicExamples,
    Category.Fiction,
    Category.Funny,
    Category.Entertaining,
    Category.Creative,
    Category.Informative,
    Category.Boring,
    Category.LowQuality,
    Category.Misleading
] as const;

const validActions: SelectOption[] = [{
    value: LabelAction.Nothing,
    label: chrome.i18n.getMessage("slopNothingAction")
}, {
    value: LabelAction.Color,
    label: chrome.i18n.getMessage("slopColorOverlayAction")
}];

interface Group {
    name: string;
    id: string;
    action: LabelAction;
    color?: string;
}

export const LabelOptionsComponent = () => {
    const [groups, setGroups] = React.useState<Group[]>([{
        name: chrome.i18n.getMessage("slopDoNothingGroup"),
        id: "00",
        action: LabelAction.Nothing,
    }, ...Config.config!.labelConfig.map((a, i) => ({
        ...a,
        id: String(i)
    }))]);

    const [categoriesPerGroup, setCategoriesPerGroup] = React.useState<Record<string, Category[]>>(() => {
        const record: Record<string, Category[]> = {
            "00": validOptions.filter(
                    (c) => !Config.config!.labelConfig.find((v) => v.categories.includes(c))
            ) as Category[],
        };
        Config.config!.labelConfig.forEach((a, i) => {
            record[String(i)] = [...a.categories];
        });
        return record;
    });
    console.log("RENDER", groups)

    return (
        <>
            <DragDropProvider
                onDragOver={(event) => {
                    const { source, target } = event.operation;

                    if (target?.id === "00" && source?.type !== "item") {
                        event.preventDefault()
                    }

                    if (source && target && source.id !== target.id) {
                        if (source.type === "item" && source["group"] !== target.id) {
                            setCategoriesPerGroup((prev) => move(prev, event));
                        }
                    }
                }}
                onBeforeDragStart={(event) => {
                    const {source} = event.operation;
                    if (source?.id === "00") {
                        event.preventDefault();
                    }
                }}
                onDragEnd={(event) => {
                    const {source} = event.operation;

                    if (source?.type === 'column') {
                        setGroups((prev) => {
                            const result = move(prev, event);
                            // Don't allow moving another column to the top
                            console.log(result)
                            if (result[0].id !== "00") return prev;

                            saveGroups(result, categoriesPerGroup);
                            return result;
                        });
                    } else {
                        saveGroups(groups, categoriesPerGroup);
                    }
                }}>

                <OptionGroup 
                        key={groups[0].id}
                        group={groups[0]}
                        index={0}
                        disableDrag={true}
                        onChange={(g) => {
                            setGroups((prev) => {
                                const indexToChange = prev.findIndex((g2) => g.id === g2.id);
                                const result = [...prev];
                                if (indexToChange !== -1) {
                                    result[indexToChange] = g;
                                }

                                saveGroups(result, categoriesPerGroup);
                                return result;
                            });
                        }}
                        className="doNothingOptionGroup">
                    {categoriesPerGroup[groups[0].id].map((cat, index) => (
                        <Item key={cat} id={cat} index={index} column={groups[0].id} />
                    ))}
                </OptionGroup>

                <div className="labelOptionsContainer">
                    {groups.slice(1).map((g, groupIndex) => (
                        <OptionGroup
                                key={g.id}
                                group={g}
                                onChange={(g) => {
                                    setGroups((prev) => {
                                        const indexToChange = prev.findIndex((g2) => g.id === g2.id);
                                        const result = [...prev];
                                        if (indexToChange !== -1) {
                                            result[indexToChange] = g;
                                        }

                                        saveGroups(result, categoriesPerGroup);
                                        return result;
                                    });
                                }}
                                index={groupIndex}>
                            {categoriesPerGroup[g.id].map((cat, index) => (
                                <Item key={cat} id={cat} index={index} column={g.id} />
                            ))}
                        </OptionGroup>
                    ))}
                </div>
            </DragDropProvider>
        </>
    );
}

interface OptionGroupProps {
    children: React.ReactElement[];
    index: number;
    disableDrag?: boolean;
    className?: string;
    onChange: (g: Group) => void;

    group: Group;
}

const OptionGroup = React.memo(function OptionGroup({ children, group, index, disableDrag, className, onChange }: OptionGroupProps) {
    const {ref, isDragging} = useSortable({
        id: group.id,
        index,
        type: "column",
        collisionPriority: CollisionPriority.Low,
        accept: ["column", "item"],
    });

    const titleRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        titleRef.current!.innerText = group.name;
    }, []);

    return (
        <div className={"labelOptionGroupContainer " + (isDragging ? "dragging " : "") + (className ? className : "")}
                style={{
                    borderColor: group.color ? group.color : undefined,
                    backgroundColor: group.color ? `${group.color}20` : undefined,
                }}
                ref={ref}>
            <div className="labelOptionGroupTitle"
                    ref={titleRef}
                    onInput={(e) => {
                        e.stopPropagation();

                        const target = e.target as HTMLTextAreaElement;
                        group.name = target.innerText as LabelAction;
                        onChange({
                            ...group
                        });
                    }}
                    onKeyDown={(e) => {
                        e.stopPropagation()

                        // Prevent newlines
                        if (e.key === "Enter") {
                            e.preventDefault();
                        }
                    }}
                    onKeyUp={(e) => {
                        e.stopPropagation()
                    }}
                    onPaste={(e) => {
                        e.preventDefault();

                        const text = e.clipboardData?.getData?.("text/plain")?.replace(/\n/g, " ") ?? "";
                        document.execCommand("insertText", false, text);
                    }}
                    contentEditable={true}>
            </div>

            <div className={`labelOptionGroupActionContainer ${disableDrag ? "hidden " : ""}`}>
                <div className="labelOptionGroupAction">
                    <div className="labelOptionGroupActionTitle">
                        {chrome.i18n.getMessage("slopAction")}
                    </div>

                    <select
                        className="sb-selector-element sb-optionsSelector"
                        value={group.action}
                        onChange={(e) => {
                            group.action = e.target.value as LabelAction;
                            onChange({
                                ...group
                            });
                        }}>
                        {getOptions(validActions)}
                    </select>
                </div>

                {
                    group.action === LabelAction.Color &&
                    <input
                        type="color"
                        value={group.color}
                        onChange={(e) => {
                            group.color = e.target.value
                            onChange({
                                ...group
                            });
                        }}
                    />

                }
            </div>


            <div className="labelOptionGroup">
                {children}
            </div>
        </div>
    );
});

interface ItemProps {
    id: string;
    index: number;
    column: UniqueIdentifier;
}

const Item = React.memo(function Item({ id, index, column }: ItemProps) {
  const {ref, isDragging} = useSortable({
    id,
    index,
    type: "item",
    accept: "item",
    plugins: [Feedback.configure({ feedback: "clone" })],
    group: column
  });

  //todo: add description
  return (
    <div className={`labelOption ` + (isDragging ? "dragging " : "")} ref={ref}>
      <span className="labelOptionName">
        {chrome.i18n.getMessage("slop_category_" + id.replace(/-/g, "_"))}
      </span>
      <Handle />
    </div>
  );
});

export interface HandleProps extends React.HTMLAttributes<HTMLButtonElement> {
  variant?: string;
}

function Handle() {
    return (
        <div className="handle" >
            <DragIcon/>
        </div>
    );
}

interface SelectOption {
    value: string;
    label: string;
}

function getOptions(options: SelectOption[]): React.ReactNode[] {
    return options.map((option) => {
        return (
            <option value={option.value} key={option.value}>{option.label}</option>
        );
    });
}

let lastSave = 0;
let lastSaveTimeout = 0 as unknown as NodeJS.Timeout;
function saveGroups(groups: Group[], categoryData: Record<string, Category[]>) {
    if (Date.now() - lastSave < 500) {
        // Buffer save requests
        clearTimeout(lastSaveTimeout);
        lastSaveTimeout = setTimeout(() => saveGroups(groups, categoryData), Date.now() - lastSave);
    }

    lastSave = Date.now();

    const newGroups: LabelConfig[] = [];
    for (let i = 1; i < groups.length; i++) {
        newGroups.push({
            name: groups[i].name,
            action: groups[i].action,
            color: groups[i].color,
            categories: categoryData[groups[i].id]
        } as LabelConfig);
    }

    Config.config!.labelConfig = newGroups;
}