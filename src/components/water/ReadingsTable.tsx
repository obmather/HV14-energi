import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { readingsQuery } from "@/lib/water/queries";
import { formatDateTime, formatM3 } from "@/lib/water/format";
import { EmptyState, QueryError } from "./status";

const PAGE = 50;

export function ReadingsTable({ meterId }: { meterId: string }) {
  const q = useQuery(readingsQuery(meterId));
  const [desc, setDesc] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const sorted = useMemo(() => {
    const list = [...(q.data ?? [])];
    list.sort((a, b) => (desc ? -1 : 1) * (a.measuredAt.getTime() - b.measuredAt.getTime()));
    return list;
  }, [q.data, desc]);

  if (q.isPending) return <Skeleton className="h-48 w-full" />;
  if (q.isError) return <QueryError onRetry={() => q.refetch()} />;
  if (sorted.length === 0) return <EmptyState />;
  const hasReceived = sorted.some((r) => r.receivedAt);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button className="inline-flex items-center gap-1 font-medium" onClick={() => setDesc((d) => !d)}>
                  Måletidspunkt {desc ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                </button>
              </TableHead>
              {hasReceived && <TableHead>Mottatt</TableHead>}
              <TableHead className="text-right">Målerstand</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.slice(0, limit).map((r) => (
              <TableRow key={`${r.measuredAt.getTime()}-${r.type}`}>
                <TableCell className="tabular">{formatDateTime(r.measuredAt)}</TableCell>
                {hasReceived && <TableCell className="tabular">{r.receivedAt ? formatDateTime(r.receivedAt) : "–"}</TableCell>}
                <TableCell className="text-right font-medium tabular">
                  {r.valueM3 != null ? formatM3(r.valueM3) : <span className="text-destructive">Ugyldig</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.type ?? "–"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Viser {Math.min(limit, sorted.length)} av {sorted.length} avlesninger</span>
        {limit < sorted.length && (
          <Button size="sm" variant="outline" onClick={() => setLimit((l) => l + PAGE * 4)}>Vis flere</Button>
        )}
      </div>
    </div>
  );
}
