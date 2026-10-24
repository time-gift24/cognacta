import { cn } from "@/lib/beui/utils";
import { InlineCode } from "./docs-content";
import { DOCS_PAYLOAD_FIELDS, type DocsPayloadField } from "./docs-data";

export type DocsPayloadTableLabels = {
  caption: string;
  field: string;
  type: string;
  description: string;
};

const DEFAULT_LABELS: DocsPayloadTableLabels = {
  caption: "Event payload fields",
  field: "Field",
  type: "Type",
  description: "Description",
};

export type DocsPayloadTableProps = {
  fields?: readonly DocsPayloadField[];
  labels?: Partial<DocsPayloadTableLabels>;
  className?: string;
};

export function DocsPayloadTable({
  fields = DOCS_PAYLOAD_FIELDS,
  labels,
  className,
}: DocsPayloadTableProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl border border-border",
        className,
      )}
    >
      <table className="w-full min-w-md text-left text-sm">
        <caption className="sr-only">{copy.caption}</caption>
        <thead className="border-border border-b text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-normal">
              {copy.field}
            </th>
            <th scope="col" className="px-4 py-3 font-normal">
              {copy.type}
            </th>
            <th scope="col" className="px-4 py-3 font-normal">
              {copy.description}
            </th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr
              key={field.name}
              className="border-border border-b last:border-b-0"
            >
              <th scope="row" className="px-4 py-3 font-normal">
                <InlineCode>{field.name}</InlineCode>
              </th>
              <td className="px-4 py-3 font-mono text-muted-foreground text-xs">
                {field.type}
              </td>
              <td className="px-4 py-3 text-muted-foreground leading-6">
                {field.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
