import { useRef, useState } from "react";
import { identify } from "sql-query-identifier";
import { LucidePlay } from "lucide-react";
import SqlEditor from "@/components/sql-editor";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useDatabaseDriver } from "@/context/DatabaseDriverProvider";
import ResultTable from "@/components/query-result-table";
import { useAutoComplete } from "@/context/AutoCompleteProvider";
import { MultipleQueryProgress, multipleQuery } from "@/lib/multiple-query";
import QueryProgressLog from "../query-progress-log";
import OptimizeTableState from "../table-optimized/OptimizeTableState";
import { KEY_BINDING } from "@/lib/key-matcher";
import { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { selectStatementFromPosition } from "@/lib/sql-helper";

export default function QueryWindow() {
  const { schema } = useAutoComplete();
  const { databaseDriver } = useDatabaseDriver();
  const [code, setCode] = useState("");
  const [data, setData] = useState<OptimizeTableState>();
  const [progress, setProgress] = useState<MultipleQueryProgress>();
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [lineNumber, setLineNumber] = useState(0);
  const [columnNumber, setColumnNumber] = useState(0);

  const onRunClicked = (all = false) => {
    const statements = identify(code, {
      dialect: "sqlite",
      strict: false,
    });

    let finalStatements: string[] = [];

    const editor = editorRef.current;

    if (all) {
      finalStatements = statements.map((s) => s.text);
    } else if (editor && editor.view) {
      const position = editor.view.state.selection.main.head;
      const statement = selectStatementFromPosition(statements, position);

      if (statement) {
        finalStatements = [statement.text];
      }
    }

    if (finalStatements.length > 0) {
      // Reset the result and make a new query
      setData(undefined);
      setProgress(undefined);

      multipleQuery(databaseDriver, finalStatements, (currentProgrss) => {
        setProgress(currentProgrss);
      })
        .then(({ last }) => {
          if (last) {
            const state = OptimizeTableState.createFromResult(last);
            state.setReadOnlyMode(true);
            setData(state);
          }
        })
        .catch(console.error);
    }
  };

  return (
    <ResizablePanelGroup direction="vertical">
      <ResizablePanel style={{ position: "relative" }}>
        <div className="absolute left-0 right-0 top-0 bottom-0 flex flex-col">
          <div className="flex-grow overflow-hidden">
            <SqlEditor
              ref={editorRef}
              value={code}
              onChange={setCode}
              schema={schema}
              onCursorChange={(_, line, col) => {
                setLineNumber(line);
                setColumnNumber(col);
              }}
              onKeyDown={(e) => {
                if (KEY_BINDING.run.match(e)) {
                  onRunClicked();
                  e.preventDefault();
                }
              }}
            />
          </div>
          <div className="flex-grow-0 flex-shrink-0">
            <Separator />
            <div className="flex gap-1 p-1">
              <Button variant={"ghost"} onClick={() => onRunClicked()}>
                <LucidePlay className="w-4 h-4 mr-2" />
                Run Current{" "}
                <span className="text-xs ml-2 px-2 bg-secondary py-1 rounded">
                  {KEY_BINDING.run.toString()}
                </span>
              </Button>

              <Button variant={"ghost"} onClick={() => onRunClicked(true)}>
                <LucidePlay className="w-4 h-4 mr-2" />
                Run All
              </Button>

              <div className="grow justify-end items-center flex text-sm mr-2 gap-2">
                <div>Ln {lineNumber}</div>
                <div>Col {columnNumber + 1}</div>
              </div>
            </div>
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} style={{ position: "relative" }}>
        {data && <ResultTable data={data} />}
        {!data && progress && (
          <div className="w-full h-full overflow-y-auto overflow-x-hidden">
            <QueryProgressLog progress={progress} />
          </div>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
