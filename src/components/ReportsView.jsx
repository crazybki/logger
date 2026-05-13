import { useMemo, useState } from "react";
import { Icon } from "./Icons";
import {
  buildReportSummary,
  formatDateShort,
  formatMissingDelta,
  formatTimeShort,
  getWeekdayLabel,
} from "../utils/reporting";

export function ReportsView({
  entries,
  nowTick,
  dailyTargetSeconds,
  onClose,
  onAddManualTime,
}) {
  const [period, setPeriod] = useState("week");

  const report = useMemo(
    () => buildReportSummary(entries, nowTick, dailyTargetSeconds, period),
    [dailyTargetSeconds, entries, nowTick, period]
  );

  const progressPercent = report.totalTargetSeconds
    ? Math.min(100, Math.round((report.totalLoggedSeconds / report.totalTargetSeconds) * 100))
    : 0;
  const topTicketSeconds = report.tickets[0]?.seconds || 0;

  return (
    <section className="reports-view">
      <div className="reports-header">
        <div className="reports-title">
          <Icon name="report" size={14} />
          <h2>Reports</h2>
        </div>

        <button
          type="button"
          className="todo-close-btn"
          onClick={onClose}
          title="Close reports"
        >
          <Icon name="close" size={13} />
        </button>
      </div>

      <div className="reports-toolbar">
        <div className="missing-tabs">
          <button
            type="button"
            className={period === "week" ? "active" : ""}
            onClick={() => setPeriod("week")}
          >
            Week
          </button>
          <button
            type="button"
            className={period === "month" ? "active" : ""}
            onClick={() => setPeriod("month")}
          >
            Month
          </button>
        </div>
      </div>

      <div className="reports-summary-grid">
        <div>
          <span>Logged</span>
          <strong>{formatTimeShort(report.totalLoggedSeconds)}</strong>
        </div>
        <div>
          <span>Target</span>
          <strong>{formatTimeShort(report.totalTargetSeconds)}</strong>
        </div>
        <div>
          <span>{report.overSeconds > 0 ? "Over" : "Missing"}</span>
          <strong className={report.overSeconds > 0 ? "positive" : "warning"}>
            {formatTimeShort(report.overSeconds || report.missingSeconds)}
          </strong>
        </div>
      </div>

      <div className="reports-progress-card">
        <div className="missing-week-row">
          <span>{period === "week" ? "This week" : "This month"}</span>
          <strong>{progressPercent}%</strong>
        </div>
        <div className="missing-progress-track">
          <div className="missing-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="reports-section">
        <div className="reports-section-header">
          <h3>By ticket</h3>
          <span>{report.tickets.length} tickets</span>
        </div>

        <div className="reports-ticket-list">
          {report.tickets.length === 0 ? (
            <p className="missing-empty">No logged time in this period</p>
          ) : (
            report.tickets.slice(0, 8).map((ticket) => {
              const ticketPercent = topTicketSeconds
                ? Math.max(4, Math.round((ticket.seconds / topTicketSeconds) * 100))
                : 0;

              return (
                <div key={ticket.ticketName} className="reports-ticket-row">
                  <div>
                    <strong>{ticket.ticketName}</strong>
                    <span>{formatTimeShort(ticket.seconds)}</span>
                  </div>
                  <div className="reports-ticket-track">
                    <div style={{ width: `${ticketPercent}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="reports-section reports-days-section">
        <div className="reports-section-header">
          <h3>By day</h3>
          <span>Target {formatTimeShort(dailyTargetSeconds)} / day</span>
        </div>

        <div className="missing-day-list">
          {report.days.map((day) => (
            <div
              key={day.dateKey}
              className={`missing-day ${day.deltaSeconds < 0 ? "partial" : day.deltaSeconds > 0 ? "over" : "done"}`}
            >
              <div className="missing-day-main">
                <div className="missing-day-label">
                  <strong>{formatDateShort(day.dateKey)}</strong>
                  <span>{getWeekdayLabel(day.dateKey)}</span>
                  <em>{day.deltaSeconds >= 0 ? "DONE" : "MISSING"}</em>
                </div>
                <div className="missing-day-track">
                  <div className="missing-day-fill" style={{ width: `${day.percent}%` }} />
                </div>
              </div>

              <div className="missing-day-side">
                <strong>{formatTimeShort(day.loggedSeconds)}</strong>
                <span>{formatMissingDelta(day.deltaSeconds)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="missing-footer">
        <span>Days counted: <strong>{report.days.length}</strong></span>
        <button type="button" onClick={onAddManualTime}>
          <Icon name="plus" size={12} />
          <span>Add time</span>
        </button>
      </div>
    </section>
  );
}
