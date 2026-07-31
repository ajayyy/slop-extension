import * as React from "react";
import { SubmissionData, ToSubmitData } from "../utils/dataFetching";
import { Category } from "../config/config";

interface VoteType {
    id: Category;
    videoOnly?: boolean;
    notAi?: boolean;
    type?: number; // to restrict contradicting votes
}

const slopVoteTypes: VoteType[] = [{
    id: Category.TTSAI,
    videoOnly: true //todo: support video only
}, {
    id: Category.TTSMostlyTTS,
    videoOnly: true //todo: support video only
}, {
    id: Category.TTSMostlyHuman,
    videoOnly: true //todo: support video only
}, {
    id: Category.AIScript
}, {
    id: Category.AIThumbnail,
    videoOnly: true
}, {
    id: Category.AIMusic,
    videoOnly: true
}, {
    id: Category.AIGraphicsMost,
    videoOnly: true
}, {
    id: Category.AIGraphicsLimited,
    videoOnly: true
}, {
    id: Category.AIGraphicsCommentary,
    videoOnly: true
}, {
    id: Category.AITopicExamples,
}, {
    id: Category.AITopicNoExamples,
}, {
    id: Category.Fiction,
    notAi: true
}];

const subjectiveVoteTypes: VoteType[] = [{
    id: Category.Funny,
    type: 1,
    notAi: true
}, {
    id: Category.Entertaining,
    type: 1,
    notAi: true
}, {
    id: Category.Creative,
    type: 1,
    notAi: true
}, {
    id: Category.Informative,
    type: 1,
    notAi: true
}, {
    id: Category.Boring,
    type: 2,
    notAi: true
}, {
    id: Category.LowQuality,
    type: 2,
    notAi: true
}, {
    id: Category.Misleading,
    type: 2,
    notAi: true
}, {
    id: Category.Scam,
    type: 2,
    notAi: true
}];

//todo: add five star overall rating

export interface ReportInterfaceComponentProps {
    existingVotes: SubmissionData;
    
    submitClicked: (data: ToSubmitData) => Promise<boolean>;
}

export const ReportInterfaceComponent = (props: ReportInterfaceComponentProps) => {
    const voteInfo = React.useRef(new Set<string>());
    const [voteInfoReady, setVoteInfoReady] = React.useState(false);
    const [currentlySubmitting, setCurrentlySubmitting] = React.useState(false);
    const [allHuman, setAllHuman] = React.useState<boolean>(false);
    const textArea = React.useRef<HTMLTextAreaElement>(null);

    return (
        <div className="slopVoteMenuInner"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}>

            <div className="slopVoteTitle">
                <img
                    className="slopVoteTitleLogo"
                    src={chrome.runtime.getURL("icons/logo.svg")}
                />
            </div>

            <AllHuman allHuman={allHuman} setAllHuman={setAllHuman} />

            <div className="slopBoxContainer">
                <Checkboxes
                    voteInfo={voteInfo.current}
                    allHuman={allHuman}
                    existingVotes={props.existingVotes}
                    setVoteInfoReady={setVoteInfoReady}
                    voteTypes={slopVoteTypes}
                />

                <Checkboxes
                    voteInfo={voteInfo.current}
                    allHuman={allHuman}
                    existingVotes={props.existingVotes}
                    setVoteInfoReady={setVoteInfoReady}
                    voteTypes={subjectiveVoteTypes}
                />
            </div>

            <div className="slopCommentContainer">
                <textarea id="slopCommentBox" 
                    rows={5}
                    style={{ width: "80%" }} 
                    ref={textArea}
                    placeholder={chrome.i18n.getMessage("slopCommentBox")}
                />
            </div>


            <div className="cbVoteButtonContainer">
                <button className="cbNoticeButton cbVoteButton"
                    disabled={currentlySubmitting || (!voteInfoReady && !allHuman)}
                    onClick={() => {
                        const votes = [...voteInfo.current];
                        if (allHuman) votes.push("human")
                        props.submitClicked({
                            votes,
                            comment: textArea?.current?.textContent || undefined,
                            rating: 5 //todo: add this to the ui
                        }).then(() => setCurrentlySubmitting(false));

                        setCurrentlySubmitting(true);
                    }}>
                    {chrome.i18n.getMessage("submit")}
                </button>
            </div>
        </div>
    );
};

interface CheckboxesProps {
    voteInfo: Set<string>;
    voteTypes: VoteType[];
    allHuman: boolean;
    existingVotes: SubmissionData;
    setVoteInfoReady: (v: boolean) => void;
}

function Checkboxes(props: CheckboxesProps): React.ReactElement {
    const result: React.ReactElement[] = [];
    const [checkedType, setCheckedType] = React.useState<number | null>(null);
    const [checkedCount, setCheckedCount] = React.useState<number>(0);

    for (const category of props.voteTypes) {
        //todo: display profile votes in some way too
        const existingVote = props.existingVotes.content.find((v) => v.id === category.id);

        result.push(
            <Checkbox
                key={category.id}
                // todo: handle text-based sites having different keys
                langKey={"slop_category_" + category.id.replace(/-/g, "_")}
                subtitle={existingVote ? getVotesText(existingVote.votes) : undefined}
                onChange={(checked) => {
                    if (checked) {
                        props.voteInfo.add(category.id);

                        if (category.type) {
                            setCheckedType(category.type);
                            setCheckedCount(checkedCount + 1);
                        }
                    } else {
                        props.voteInfo.delete(category.id);

                        if (category.type) {
                            if (checkedCount <= 1) {
                                setCheckedType(null);
                            }
                            setCheckedCount(checkedCount - 1);
                        }
                    }

                    props.setVoteInfoReady(props.voteInfo.size > 0);
                }}
                disabled={(checkedType !== null && category.type !== undefined && checkedType !== category.type)
                        || (props.allHuman && !category.notAi)
                }
                showCheckbox={true}
            />
        );
    }

    return (
        <div style={{ display: "flex", justifyContent: "center" }}>
            <div>
                {result}
            </div>
        </div>
    );
}

function getVotesText(count: number): string {
    const format = count === 1 ? chrome.i18n.getMessage("vote") : chrome.i18n.getMessage("votes");
    return format.replace("{0}", count.toString());
}

interface CheckboxProps {
    langKey: string;
    checked?: boolean;
    onChange: (value: boolean) => void;
    subtitle?: string;
    disabled?: boolean;
    showCheckbox: boolean;
}

function Checkbox(props: CheckboxProps): React.ReactElement {
    const [checked, setChecked] = React.useState(props.checked ?? false);

    if (props.checked != null && checked !== props.checked) {
        setChecked(props.checked);
    }

    return (
        <div className={"slChecklistBox " + (props.showCheckbox ? "cbSquare cbNoAnim " : "") + (props.disabled ? "slDisabled " : "")}
                onClick={() => {
                    if (!props.disabled) {
                        setChecked(!checked);
                        props.onChange(!checked);
                    }
                }}
                key={props.langKey}>
            <div className="slChecklistCheckboxParent">
                <input type="checkbox"
                    id={props.langKey}
                    name={props.langKey}
                    checked={checked}
                    readOnly={true}
                />

                <label></label>
                {
                    props.showCheckbox &&
                    <svg width="10" height="9.33" viewBox="0 0 15 14" fill="none">
                        <path d="M2 8.36364L6.23077 12L13 2"></path>
                    </svg>
                }
            </div>

            <div className="slChecklistTextBox">
                <div className="slChecklistBoxTitle">
                    {chrome.i18n.getMessage(props.langKey)}
                </div>

                {props.subtitle && (
                    <div className="slChecklistBoxSubtitle">
                        {props.subtitle}
                    </div>
                )}
            </div>
        </div>
    );
}

interface AllHumanProps {
    allHuman: boolean;
    setAllHuman: (v: boolean) => void;
}

function AllHuman(props: AllHumanProps): React.ReactElement {
    return (
        <>
            <div className="slAllHuman">
                <Checkbox
                    langKey={"slop_category_human"}
                    checked={props.allHuman}
                    onChange={(checked) => {
                        props.setAllHuman(checked);
                    }}
                    showCheckbox={true}
                />
            </div>
        </>
    );
}