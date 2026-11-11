import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { OPTION_CATEGORIES } from "@/hooks/useSheetOptions";

export function AdminSheetOptions() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const { data = [] } = useQuery({
    queryKey: ["sheet-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sheet_options").select("*").order("sort_order").order("value");
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["sheet-options"] });

  const add = async (category: string) => {
    const value = (draft[category] || "").trim();
    if (!value) return;
    const { error } = await supabase.from("sheet_options").insert({ category, value, sort_order: 999 });
    if (error) return toast.error(error.message);
    setDraft(d => ({ ...d, [category]: "" }));
    refresh();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("sheet_options").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {OPTION_CATEGORIES.map(c => (
        <Card key={c.id} className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-base">{c.label}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {data.filter(o => o.category === c.id).map(o => (
                <Badge key={o.id} variant="secondary" className="gap-1 pr-1">
                  {o.value}
                  <button onClick={() => remove(o.id)} className="rounded hover:bg-destructive/20" aria-label={`Remover ${o.value}`}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); add(c.id); }}>
              <Input className="h-8" placeholder="Nova opção" value={draft[c.id] || ""} onChange={e => setDraft(d => ({ ...d, [c.id]: e.target.value }))} />
              <Button type="submit" size="sm" className="h-8 gap-1"><Plus className="h-4 w-4" />Adicionar</Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
