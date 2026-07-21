import type { ReactElement } from "react";
import ReactMarkdown from "react-markdown";
import RemarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownRendererProps {
    readonly content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps): ReactElement {
    return (
        <div className="prose prose-invert prose-sm max-w-none break-words">
            <ReactMarkdown
                remarkPlugins={[RemarkGfm]}
                components={{
                    code(props) {
                        const { children, className, node, ...rest } = props;
                        const match = /language-(\w+)/.exec(className || "");
                        return match ? (
                            // @ts-ignore
                            <SyntaxHighlighter
                                {...rest}
                                PreTag="div"
                                language={match[1]}
                                style={oneDark}
                                customStyle={{ margin: 0, borderRadius: "0.5rem" }}
                            >
                                {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                        ) : (
                            <code {...rest} className={className}>
                                {children}
                            </code>
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
