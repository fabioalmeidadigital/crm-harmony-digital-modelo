import { useState, useMemo } from "react";
import { useAppointments, useUpdateAppointment, type AppointmentWithLead } from "@/hooks/useAppointments";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700",
  confirmado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
  realizado: "bg-blue-100 text-blue-700",
};

interface Props {
  onSelectLead?: (leadId: string) => void;
}

export function AgendaCalendar({ onSelectLead }: Props) {
  const { data: appointments = [], isLoading } = useAppointments();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [year, month]);

  const appointmentsByDay = useMemo(() => {
    const map: Record<number, AppointmentWithLead[]> = {};
    appointments.forEach(apt => {
      const d = new Date(apt.scheduled_at);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(apt);
      }
    });
    return map;
  }, [appointments, year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date();
  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-5 w-5" /></Button>
          <h3 className="text-base font-semibold text-foreground">{MONTHS[month]} {year}</h3>
          <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-5 w-5" /></Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} className="min-h-[80px]" />;
            const dayAppts = appointmentsByDay[day] || [];
            return (
              <div
                key={day}
                className={`min-h-[80px] p-1.5 rounded-lg border text-xs ${
                  isToday(day) ? "border-accent bg-coral-lighter/30" : "border-transparent hover:bg-secondary/50"
                }`}
              >
                <span className={`font-medium ${isToday(day) ? "text-accent" : "text-foreground"}`}>{day}</span>
                <div className="mt-1 space-y-0.5">
                  {dayAppts.slice(0, 3).map(apt => (
                    <div
                      key={apt.id}
                      onClick={() => onSelectLead?.(apt.lead_id)}
                      className={`truncate rounded px-1 py-0.5 text-[10px] font-medium cursor-pointer hover:opacity-80 ${STATUS_COLORS[apt.status] || ""}`}
                      title={`${new Date(apt.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - ${apt.leads?.name || "Lead"} - ${apt.procedure_name}`}
                    >
                      {new Date(apt.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {apt.leads?.name?.split(" ")[0]}
                    </div>
                  ))}
                  {dayAppts.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{dayAppts.length - 3} mais</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
