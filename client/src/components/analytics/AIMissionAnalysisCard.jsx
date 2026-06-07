import React, { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiCpu,
  FiDatabase,
  FiEye,
  FiInfo,
  FiRefreshCw,
} from "react-icons/fi";

import {
  analyzeMissionWithAi,
  fetchAiMissionReport,
} from "../../services/aiAnalysisApi";

function GeminiIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M12 2.2c.55 4.15 2.02 6.88 4.42 8.18 1.21.66 2.98 1.19 5.31 1.62-4.15.55-6.88 2.02-8.18 4.42-.66 1.21-1.19 2.98-1.62 5.31-.55-4.15-2.02-6.88-4.42-8.18-1.21-.66-2.98-1.19-5.31-1.62 4.15-.55 6.88-2.02 8.18-4.42.66-1.21 1.19-2.98 1.62-5.31Z" />
    </svg>
  );
}

function statusClass(status) {
  if (status === "normal") return "border-success/20 bg-success/10 text-success";
  if (status === "watch") return "border-warning/20 bg-warning/10 text-warning";
  if (status === "anomaly") return "border-error/20 bg-error/10 text-error";
  if (status === "insufficient_data") {
    return "border-base-300 bg-base-100/80 text-base-content/60";
  }

  return "border-primary/20 bg-primary/10 text-primary";
}

function severityClass(severity) {
  if (severity === "high") return "badge-error";
  if (severity === "medium") return "badge-warning";
  if (severity === "low") return "badge-success";
  return "badge-ghost";
}

function formatEpoch(epoch) {
  const value = Number(epoch);
  if (!Number.isFinite(value) || value <= 0) return "—";

  try {
    return new Date(value * 1000).toLocaleString("ro-RO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error ||
    error?.message ||
    "AI analysis failed."
  );
}

function normalizeText(value, fallback = "—") {
  const text = String(value || "").trim();
  return text || fallback;
}

function formatStatus(status) {
  return normalizeText(status, "not analyzed").replaceAll("_", " ");
}

function FindingCard({ finding, index }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-base-content">
            {finding?.title || `Finding #${index + 1}`}
          </div>

          {finding?.evidence ? (
            <div className="mt-2 rounded-xl bg-base-200 px-3 py-2 font-mono text-xs leading-5 text-base-content/70">
              {finding.evidence}
            </div>
          ) : null}
        </div>

        {finding?.severity ? (
          <span
            className={`badge ${severityClass(
              finding.severity,
            )} badge-sm shrink-0 capitalize`}
          >
            {finding.severity}
          </span>
        ) : null}
      </div>

      {finding?.interpretation ? (
        <p className="mt-3 text-sm leading-6 text-base-content/65">
          {finding.interpretation}
        </p>
      ) : null}
    </div>
  );
}

function DataQualityBlock({ dataQuality }) {
  const notes = Array.isArray(dataQuality?.notes) ? dataQuality.notes : [];

  if (!dataQuality && notes.length === 0) return null;

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-base-content">
          <FiDatabase className="text-primary" />
          Data quality
        </div>

        {dataQuality?.status ? (
          <span className="badge badge-outline badge-sm capitalize">
            {String(dataQuality.status).replaceAll("_", " ")}
          </span>
        ) : null}
      </div>

      {notes.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-base-content/65">
          {notes.map((note, index) => (
            <li key={`${note}-${index}`} className="flex gap-2">
              <FiCheckCircle className="mt-1 shrink-0 text-success" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function RecommendationsBlock({ recommendations }) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-base-content">
        <FiInfo className="text-primary" />
        Recommendations
      </div>

      <ul className="mt-3 space-y-2 text-sm leading-6 text-base-content/65">
        {recommendations.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AIMissionAnalysisCard({
  missionId,
  missionName = "",
  className = "",
}) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      if (!missionId) {
        setReport(null);
        setExpanded(false);
        setErrorText("");
        return;
      }

      setLoading(true);
      setErrorText("");

      try {
        const data = await fetchAiMissionReport(missionId);

        if (cancelled) return;

        const found = Boolean(data?.exists && data?.report);
        setReport(found ? data.report : null);
        setExpanded(false);
      } catch (error) {
        if (cancelled) return;

        setReport(null);
        setExpanded(false);
        setErrorText(getErrorMessage(error));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [missionId]);

  const result = report?.result || null;
  const hasResult = Boolean(result);

  const findings = useMemo(
    () => (Array.isArray(result?.key_findings) ? result.key_findings : []),
    [result],
  );

  const modelLabel = report?.model || "gemini-2.5-flash-lite";
  const status = result?.overall_status || "not_analyzed";
  const confidence = result?.confidence || null;

  async function handleAnalyze({ regenerate = false } = {}) {
    if (!missionId) return;

    if (regenerate) {
      const accepted = window.confirm(
        "Regenerate AI analysis? This will send a new request to Gemini.",
      );

      if (!accepted) return;
    }

    setBusy(true);
    setErrorText("");

    try {
      const data = await analyzeMissionWithAi(missionId, { regenerate });

      setReport(data?.report || null);
      setExpanded(true);
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={["space-y-3", className].join(" ")}>
      <div className="rounded-3xl border border-primary/20 bg-primary/5 shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <GeminiIcon className="size-5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-base-content">
                  Analyze mission with AI
                </h2>

                {hasResult ? (
                  <span
                    className={[
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                      statusClass(status),
                    ].join(" ")}
                  >
                    {formatStatus(status)}
                  </span>
                ) : null}

                {confidence ? (
                  <span className="rounded-full border border-primary/20 bg-base-100/70 px-2.5 py-0.5 text-xs font-medium capitalize text-primary">
                    Confidence: {confidence}
                  </span>
                ) : null}
              </div>

              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-base-content/65">
                Gemini-powered telemetry interpretation using{" "}
                <span className="font-semibold text-base-content">
                  {modelLabel}
                </span>
                .
              </p>

              {hasResult ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-base-content/50">
                  <span>
                    Mission:{" "}
                    <span className="font-medium text-base-content/60">
                      {missionName || missionId}
                    </span>
                  </span>
                  <span>Updated: {formatEpoch(report?.updated_at_epoch)}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            {hasResult ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm rounded-xl px-3"
                onClick={() => setExpanded((value) => !value)}
                disabled={loading || busy}
              >
                <FiEye />
                {expanded ? "Hide results" : "View results"}
                {expanded ? <FiChevronUp /> : <FiChevronDown />}
              </button>
            ) : null}

            <button
              type="button"
              className={
                hasResult
                  ? "btn btn-outline btn-primary btn-sm rounded-xl px-4"
                  : "btn btn-primary btn-sm rounded-xl px-4"
              }
              onClick={() =>
                handleAnalyze({ regenerate: hasResult ? true : false })
              }
              disabled={loading || busy}
              title={
                hasResult
                  ? "Regenerate uses a new Gemini request."
                  : "Generate AI analysis for this mission."
              }
            >
              {busy ? (
                <span className="loading loading-spinner loading-xs" />
              ) : hasResult ? (
                <FiRefreshCw />
              ) : (
                <GeminiIcon className="size-4" />
              )}

              {busy
                ? hasResult
                  ? "Regenerating..."
                  : "Analyzing..."
                : hasResult
                  ? "Regenerate"
                  : "Analyze"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="border-t border-primary/10 px-5 pb-5">
            <div className="space-y-3 rounded-2xl bg-base-100/70 p-4">
              <div className="skeleton h-4 w-48" />
              <div className="skeleton h-16 w-full" />
            </div>
          </div>
        ) : null}

        {errorText ? (
          <div className="border-t border-primary/10 px-5 pb-5">
            <div className="rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
              <div className="flex items-start gap-2">
                <FiAlertTriangle className="mt-0.5 shrink-0" />
                <span>{errorText}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {hasResult && expanded ? (
        <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6">
          <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <FiCpu />
              Summary
            </div>

            <p className="mt-2 text-sm leading-6 text-base-content/75">
              {result.summary || "No summary available."}
            </p>
          </div>

          {findings.length ? (
            <div className="mb-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-base-content">
                  Key findings
                </h3>

                <span className="text-xs text-base-content/50">
                  {findings.length} item{findings.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {findings.map((finding, index) => (
                  <FindingCard
                    key={`${finding?.title || "finding"}-${index}`}
                    finding={finding}
                    index={index}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <DataQualityBlock dataQuality={result.data_quality} />
            <RecommendationsBlock recommendations={result.recommendations} />
          </div>

          <div className="mt-5 flex flex-col gap-2 border-t border-base-300 pt-4 text-xs text-base-content/50 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="font-medium text-base-content/60">
                Report source:
              </span>{" "}
              saved AI analysis from the local database
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Model: {modelLabel}</span>
              <span>Updated: {formatEpoch(report?.updated_at_epoch)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
