import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, RefreshCw, Download, FileText, FileSpreadsheet, Filter, Loader2, Trash2, Phone, Mail, Car, Eye, ArrowUpDown, ArrowUp, ArrowDown, Calendar as CalendarIcon, X } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminLeads, useAdminLeadsRealtime } from "@/hooks/useAdminLeads";
import { KANBAN_COLUMNS, STATUS_LABEL, type Lead, type LeadStatus } from "@/lib/kanban";
import { LeadDetailModal } from "@/components/leads/LeadDetailModal";
import { PageHeader } from "@/components/admin/PageHeader";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";

export const Route = createFileRoute("/admin/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Nexus CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LeadsPage,
});

const EXPORT_COLUMNS = [
  { id: "nome", label: "Nome" },
  { id: "whatsapp", label: "Telefone" },
  { id: "email", label: "E-mail" },
  { id: "cep", label: "CEP" },
  { id: "cidade", label: "Cidade" },
  { id: "veiculo_marca", label: "Marca" },
  { id: "veiculo_modelo", label: "Modelo" },
  { id: "veiculo_ano", label: "Ano" },
  { id: "veiculo_placa", label: "Placa" },
  { id: "veiculo_fipe", label: "FIPE" },
  { id: "veiculo_valor", label: "Valor" },
  { id: "status", label: "Status" },
  { id: "origem", label: "Origem" },
  { id: "observacoes", label: "Observações" },
  { id: "created_at", label: "Criado em" },
] as const;

type ExportColumnId = typeof EXPORT_COLUMNS[number]["id"];

const statusBadge: Record<LeadStatus, string> = {
  novo: "bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20",
  contatado: "bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20",
  cotacao_enviada: "bg-fuchsia-500/10 text-fuchsia-600 ring-1 ring-fuchsia-500/20",
  fechado: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20",
  perdido: "bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20",
};

function exportCSV(leads: Lead[], selectedColumns: ExportColumnId[]) {
  const safe = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v).trim();
    return s.toLowerCase() === "null" || s.toLowerCase() === "undefined" ? "" : s;
  };

  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return format(d, "dd/MM/yyyy HH:mm:ss");
  };

  // Ensure "nome" and "whatsapp" (Telefone) are always at the beginning
  const sortedColumns = [...selectedColumns].sort((a, b) => {
    if (a === "nome") return -1;
    if (b === "nome") return 1;
    if (a === "whatsapp") return -1;
    if (b === "whatsapp") return 1;
    return 0;
  });

  const headers = sortedColumns.map((colId) => {
    return EXPORT_COLUMNS.find((c) => c.id === colId)?.label || colId;
  });
  
  const rows = leads.map((l) => {
    return sortedColumns.map((colId) => {
      let value: any = l[colId as keyof Lead];
      if (colId === "status") value = STATUS_LABEL[l.status];
      if (colId === "created_at") value = formatDate(l.created_at);
      return safe(value);
    });
  });

  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
    
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nexus-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(
  leads: Lead[], 
  meta: { search: string; status: string; dateRange?: string; origin?: string },
  selectedColumns: ExportColumnId[]
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const today = new Date().toLocaleString("pt-BR");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Nexus CRM — Leads", 40, 40);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110);
  doc.text(`Gerado em ${today}`, 40, 56);
  
  const filterText = [
    `Status: ${meta.status}`,
    meta.origin ? `Origem: ${meta.origin}` : "",
    meta.dateRange ? `Período: ${meta.dateRange}` : "",
    meta.search ? `Busca: "${meta.search}"` : "",
    `Total: ${leads.length}`
  ].filter(Boolean).join("  ·  ");

  doc.text(`Filtros: ${filterText}`, 40, 70);
  doc.setTextColor(0);

  // Ensure "nome" and "whatsapp" (Telefone) are always at the beginning
  const sortedColumns = [...selectedColumns].sort((a, b) => {
    if (a === "nome") return -1;
    if (b === "nome") return 1;
    if (a === "whatsapp") return -1;
    if (b === "whatsapp") return 1;
    return 0;
  });

  const headers = sortedColumns.map((colId) => {
    return EXPORT_COLUMNS.find((c) => c.id === colId)?.label || colId;
  });
  
  const body = leads.map((l) => {
    return sortedColumns.map((colId) => {
      let value: any = l[colId as keyof Lead];
      if (colId === "status") return STATUS_LABEL[l.status];
      if (colId === "created_at") return new Date(l.created_at).toLocaleDateString("pt-BR");
      if (colId === "veiculo_valor") return value ? `R$ ${Number(value).toLocaleString("pt-BR")}` : "—";
      
      // Special handling for vehicle info if multiple columns aren't selected but brand/model/year are
      return value || "—";
    });
  });

  autoTable(doc, {
    startY: 90,
    head: [headers],
    body: body,
    styles: { fontSize: selectedColumns.length > 8 ? 7 : 8, cellPadding: 4 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`nexus-leads-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function exportXLSX(
  leads: Lead[],
  meta: { search: string; status: string; dateRange?: string; origin?: string },
  selectedColumns: ExportColumnId[]
) {
  const safe = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v).trim();
    return s.toLowerCase() === "null" || s.toLowerCase() === "undefined" ? "" : s;
  };
  
  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return format(d, "dd/MM/yyyy HH:mm:ss");
  };

  // Ensure "nome" and "whatsapp" (Telefone) are always at the beginning
  const sortedColumns = [...selectedColumns].sort((a, b) => {
    if (a === "nome") return -1;
    if (b === "nome") return 1;
    if (a === "whatsapp") return -1;
    if (b === "whatsapp") return 1;
    return 0;
  });

  const data = leads.map((l) => {
    const row: any = {};
    sortedColumns.forEach((colId) => {
      const col = EXPORT_COLUMNS.find((c) => c.id === colId);
      if (!col) return;

      let value: any = l[colId as keyof Lead];
      
      if (colId === "status") value = STATUS_LABEL[l.status];
      if (colId === "created_at") value = formatDate(l.created_at);
      if (colId === "veiculo_valor") value = value ? Number(value) : "";
      
      row[col.label] = safe(value);
    });
    return row;
  });

  const headers = sortedColumns.map((colId) => {
    return EXPORT_COLUMNS.find((c) => c.id === colId)?.label || colId;
  });
  const ws = XLSX.utils.json_to_sheet(data, { header: headers });

  // Adjust column widths
  ws["!cols"] = headers.map((label) => {
    if (label === "E-mail" || label === "Observações") return { wch: 30 };
    if (label === "Nome") return { wch: 25 };
    if (label === "Criado em") return { wch: 20 };
    return { wch: 15 };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Leads");

  const metaData = [
    ["Nexus CRM — Leads"],
    ["Gerado em", formatDate(new Date().toISOString())],
    ["Status", meta.status],
    ["Origem", meta.origin || "Todos"],
    ["Período", meta.dateRange || "Todo o período"],
    ["Busca", meta.search || ""],
    ["Total", String(leads.length)],
  ];
  
  const metaWs = XLSX.utils.aoa_to_sheet(metaData);
  XLSX.utils.book_append_sheet(wb, metaWs, "Filtros");

  XLSX.writeFile(wb, `nexus-leads-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

type SortKey = "nome" | "whatsapp" | "status" | "created_at";
type SortDir = "asc" | "desc";

function LeadsPage() {
  const { user, loading: authLoading } = useAuth();
  const leadsEnabled = !authLoading && !!user;
  const { leads, loading, syncing, refresh, setLeads } = useAdminLeads({ enabled: leadsEnabled });
  useAdminLeadsRealtime(leadsEnabled);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [selected, setSelected] = useState<Lead | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedExportColumns, setSelectedExportColumns] = useState<ExportColumnId[]>(
    EXPORT_COLUMNS.map((c) => c.id),
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const origins = useMemo(() => {
    const set = new Set(leads.map((l) => l.origem).filter(Boolean));
    return Array.from(set).sort();
  }, [leads]);

  const fetchLeads = (showToast = false) =>
    refresh({ showToast, successMessage: "Leads atualizados", errorMessage: "Erro ao carregar leads" });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (originFilter !== "all" && l.origem !== originFilter) return false;
      
      if (dateRange.from || dateRange.to) {
        const leadDate = new Date(l.created_at);
        if (dateRange.from && leadDate < dateRange.from) return false;
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (leadDate > toDate) return false;
        }
      }

      if (!q) return true;
      return [l.nome, l.whatsapp, l.email, l.veiculo_marca, l.veiculo_modelo]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = sortKey === "created_at" ? new Date(a.created_at).getTime() : String(a[sortKey] ?? "").toLowerCase();
      const bv = sortKey === "created_at" ? new Date(b.created_at).getTime() : String(b[sortKey] ?? "").toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [leads, search, statusFilter, originFilter, dateRange, sortKey, sortDir]);

  const handleStatusChange = async (id: string, status: LeadStatus) => {
    const previous = leads;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (error) {
      setLeads(previous);
      toast.error("Falha ao atualizar");
    } else toast.success("Status atualizado");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este lead permanentemente?")) return;
    const previous = leads;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      setLeads(previous);
      toast.error("Falha ao excluir");
    } else toast.success("Lead excluído");
  };

  return (
    <div className="relative min-h-screen">
      <PageHeader
        title="Todos os"
        highlight="Leads"
        subtitle={`${filtered.length} de ${leads.length} ${leads.length === 1 ? "lead" : "leads"}`}
        breadcrumbs={[{ label: "Painel" }, { label: "Gestão" }, { label: "Leads" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors hover:bg-accent">
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4" align="end">
                <h4 className="mb-3 font-semibold text-sm">Exportar para CSV</h4>
                <p className="mb-3 text-xs text-muted-foreground">Selecione as colunas desejadas:</p>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 mb-4">
                  {EXPORT_COLUMNS.map((col) => (
                    <div key={col.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`csv-col-${col.id}`}
                        checked={selectedExportColumns.includes(col.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedExportColumns([...selectedExportColumns, col.id]);
                          } else {
                            setSelectedExportColumns(selectedExportColumns.filter((id) => id !== col.id));
                          }
                        }}
                      />
                      <Label htmlFor={`csv-col-${col.id}`} className="text-xs cursor-pointer">
                        {col.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <Button 
                  size="sm" 
                  className="w-full h-8 text-xs font-bold" 
                  onClick={() => exportCSV(filtered, selectedExportColumns)}
                  disabled={selectedExportColumns.length === 0}
                >
                  Download .csv
                </Button>
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <button className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors hover:bg-accent">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4" align="end">
                <h4 className="mb-3 font-semibold text-sm">Exportar para Excel</h4>
                <p className="mb-3 text-xs text-muted-foreground">Selecione as colunas desejadas:</p>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 mb-4">
                  {EXPORT_COLUMNS.map((col) => (
                    <div key={col.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`xlsx-col-${col.id}`}
                        checked={selectedExportColumns.includes(col.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedExportColumns([...selectedExportColumns, col.id]);
                          } else {
                            setSelectedExportColumns(selectedExportColumns.filter((id) => id !== col.id));
                          }
                        }}
                      />
                      <Label htmlFor={`xlsx-col-${col.id}`} className="text-xs cursor-pointer">
                        {col.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <Button 
                  size="sm" 
                  className="w-full h-8 text-xs font-bold" 
                  onClick={() => {
                    const dateRangeStr = dateRange.from ? `${format(dateRange.from, "dd/MM/yy")} - ${dateRange.to ? format(dateRange.to, "dd/MM/yy") : ""}` : undefined;
                    exportXLSX(
                      filtered, 
                      { 
                        search, 
                        status: statusFilter, 
                        origin: originFilter === "all" ? undefined : originFilter,
                        dateRange: dateRangeStr
                      }, 
                      selectedExportColumns
                    );
                  }}
                  disabled={selectedExportColumns.length === 0}
                >
                  Download .xlsx
                </Button>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors hover:bg-accent">
                  <FileText className="h-3.5 w-3.5" /> PDF
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4" align="end">
                <h4 className="mb-3 font-semibold text-sm">Exportar para PDF</h4>
                <p className="mb-3 text-xs text-muted-foreground">Selecione as colunas desejadas:</p>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 mb-4">
                  {EXPORT_COLUMNS.map((col) => (
                    <div key={col.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`pdf-col-${col.id}`}
                        checked={selectedExportColumns.includes(col.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedExportColumns([...selectedExportColumns, col.id]);
                          } else {
                            setSelectedExportColumns(selectedExportColumns.filter((id) => id !== col.id));
                          }
                        }}
                      />
                      <Label htmlFor={`pdf-col-${col.id}`} className="text-xs cursor-pointer">
                        {col.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <Button 
                  size="sm" 
                  className="w-full h-8 text-xs font-bold" 
                  onClick={() => {
                    const dateRangeStr = dateRange.from ? `${format(dateRange.from, "dd/MM/yy")} - ${dateRange.to ? format(dateRange.to, "dd/MM/yy") : ""}` : undefined;
                    exportPDF(
                      filtered, 
                      { 
                        search, 
                        status: statusFilter, 
                        origin: originFilter === "all" ? undefined : originFilter,
                        dateRange: dateRangeStr
                      }, 
                      selectedExportColumns
                    );
                  }}
                  disabled={selectedExportColumns.length === 0}
                >
                  Download .pdf
                </Button>
              </PopoverContent>
            </Popover>
            <button
              onClick={() => fetchLeads(true)}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.04] disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              Sincronizar
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="glass relative flex flex-1 items-center gap-2 rounded-full px-3 py-1.5 min-w-[200px] max-w-md">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, WhatsApp, e-mail, veículo…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="glass flex items-center gap-1.5 rounded-full px-2 py-1.5">
              <Filter className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
                className="bg-transparent pr-2 text-xs font-medium outline-none"
              >
                <option value="all">Todos os status</option>
                {KANBAN_COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="glass flex items-center gap-1.5 rounded-full px-2 py-1.5">
              <select
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                className="bg-transparent px-2 text-xs font-medium outline-none"
              >
                <option value="all">Todas as origens</option>
                {origins.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <button className={`glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent ${(dateRange.from || dateRange.to) ? "border-primary/50 text-primary" : ""}`}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yy")
                    )
                  ) : (
                    "Período"
                  )}
                  {(dateRange.from || dateRange.to) && (
                    <X 
                      className="h-3 w-3 ml-1 hover:text-destructive" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDateRange({ from: undefined, to: undefined });
                      }}
                    />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </PageHeader>

      <div className="px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass mx-auto max-w-md rounded-2xl p-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhum lead encontrado.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="glass hidden overflow-hidden rounded-2xl md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      {([
                        { key: "nome" as SortKey, label: "Lead" },
                        { key: "whatsapp" as SortKey, label: "Contato" },
                        { key: null, label: "Veículo" },
                        { key: "status" as SortKey, label: "Status" },
                        { key: "created_at" as SortKey, label: "Data" },
                      ] as const).map((col) => (
                        <th key={col.label} className="px-4 py-3 font-semibold">
                          {col.key ? (
                            <button
                              onClick={() => toggleSort(col.key as SortKey)}
                              className="inline-flex items-center gap-1 hover:text-foreground"
                            >
                              {col.label}
                              {sortKey === col.key
                                ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                                : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                            </button>
                          ) : col.label}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((l) => (
                      <tr key={l.id} className="border-b border-border/40 transition-colors hover:bg-accent/30">
                        <td className="px-4 py-3">
                          <p className="font-semibold">{l.nome}</p>
                          {l.cep && <p className="text-xs text-muted-foreground">CEP {l.cep}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3" />{l.whatsapp}</span>
                            {l.email && <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3 w-3" />{l.email}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="inline-flex items-center gap-1.5">
                            <Car className="h-3 w-3 text-muted-foreground" />
                            {[l.veiculo_marca, l.veiculo_modelo].filter(Boolean).join(" ") || "—"}
                            {l.veiculo_ano ? ` · ${l.veiculo_ano}` : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={l.status}
                            onChange={(e) => handleStatusChange(l.id, e.target.value as LeadStatus)}
                            className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold outline-none ${statusBadge[l.status]}`}
                          >
                            {KANBAN_COLUMNS.map((c) => (
                              <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                          {new Date(l.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelected(l)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                              aria-label="Ver detalhes"
                              title="Ver detalhes"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(l.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {filtered.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelected(l)}
                  className="glass rounded-2xl p-4 text-left transition-transform active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{l.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{l.whatsapp}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge[l.status]}`}>
                      {STATUS_LABEL[l.status]}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Car className="h-3.5 w-3.5" />
                    {[l.veiculo_marca, l.veiculo_modelo].filter(Boolean).join(" ") || "—"}
                    {l.veiculo_ano ? ` · ${l.veiculo_ano}` : ""}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
                    <span>{new Date(l.created_at).toLocaleDateString("pt-BR")}</span>
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Eye className="h-3 w-3" /> Detalhes
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <LeadDetailModal
        lead={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onSaved={(updated) =>
          setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
        }
        onDeleted={(id) => setLeads((prev) => prev.filter((l) => l.id !== id))}
      />
    </div>
  );
}
