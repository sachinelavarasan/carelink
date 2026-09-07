import type { AppointmentListItem, AppointmentPage } from '@carelink/shared';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { enIN } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar';
import { Link } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardContent } from '../components/ui/card';
import { fmtDateTime } from '../lib/format';
import './appointments-calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-IN': enIN },
});

interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: AppointmentListItem;
}

export default function AppointmentsCalendar({
  data,
  isLoading,
  role,
  onCancel,
}: {
  data: AppointmentPage | undefined;
  isLoading: boolean;
  role: string | undefined;
  onCancel: (id: string) => void;
}) {
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [selected, setSelected] = useState<AppointmentListItem | null>(null);

  const events = useMemo<CalEvent[]>(
    () =>
      (data?.items ?? []).map((a) => ({
        id: a.id,
        title: `${a.counterpartyName}${a.reasonForVisit ? ` — ${a.reasonForVisit}` : ''}`,
        start: new Date(a.scheduledStart),
        end: new Date(a.scheduledEnd),
        resource: a,
      })),
    [data],
  );

  return (
    <div className="mt-3 grid gap-4">
      {isLoading && (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading…
        </p>
      )}

      <div style={{ height: 640 }}>
        <Calendar<CalEvent>
          localizer={localizer}
          culture="en-IN"
          events={events}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          popup
          onSelectEvent={(e) => setSelected(e.resource)}
          eventPropGetter={(e) => ({
            className: `rbc-evt-${e.resource.status.toLowerCase()}`,
          })}
          tooltipAccessor={(e) => e.title}
        />
      </div>

      {selected && (
        <Card>
          <CardContent className="grid gap-1">
            <div className="flex items-center justify-between gap-4">
              <strong className="font-medium">{fmtDateTime(selected.scheduledStart)}</strong>
              <StatusBadge kind="appointment" status={selected.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              with {selected.counterpartyName}
              {selected.reasonForVisit ? ` — ${selected.reasonForVisit}` : ''}
            </p>
            <div className="mt-1 flex items-center gap-4 text-sm">
              {selected.status === 'CONFIRMED' && selected.chatThreadId && (
                <>
                  {/* Chat consultation hidden for now */}
                  <Link
                    className="text-primary underline underline-offset-4"
                    to={`/consult/${selected.id}/video`}
                  >
                    Video call
                  </Link>
                  <Link
                    className="text-primary underline underline-offset-4"
                    to={`/appointments/${selected.id}/prescription`}
                  >
                    Prescription
                  </Link>
                </>
              )}
              {selected.status === 'CONFIRMED' && role === 'PATIENT' && (
                <Link
                  className="text-primary underline underline-offset-4"
                  to={`/book?reschedule=${selected.id}`}
                >
                  Reschedule
                </Link>
              )}
              {selected.status === 'CONFIRMED' && (
                <button
                  type="button"
                  className="text-destructive hover:underline"
                  onClick={() => onCancel(selected.id)}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={() => setSelected(null)}
              >
                Dismiss
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
