"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import bankRaw from "../../../../data/questionBank.json";
import { AttemptSummary, QuestionBank } from "../../../../lib/types";
import { formatTime } from "../../../../lib/utils";

export default function ResultsPage() {
  const params = useParams<{ categoryId: string; setId: string }>();
  const router = useRouter();
  const bank = bankRaw as unknown as QuestionBank;

  const [attempt, setAttempt] = useState<AttemptSummary | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("vetmcq_lastAttempt");
    if (!raw) return;
    try {
      setAttempt(JSON.parse(raw) as AttemptSummary);
    } catch {}
  }, []);

  const category = bank.categories.find((c) => c.id === params.categoryId);
  const set = category?.sets.find((s) => s.id === params.setId);

  const analysis = useMemo(() => {
    if (!attempt || !set) return null;

    const total = attempt.answers.length;
    const correct = attempt.answers.filter((a) => a.isCorrect).length;
    const percent = total ? Math.round((correct / total) * 100) : 0;
    const duration = attempt.finishedAt - attempt.startedAt;

    const bySub: Record<string, { total: number; correct: number; wrongIds: string[] }> = {};
    for (const a of attempt.answers) {
      if (!bySub[a.subcategoryId]) bySub[a.subcategoryId] = { total: 0, correct: 0, wrongIds: [] };
      bySub[a.subcategoryId].total++;
      if (a.isCorrect) bySub[a.subcategoryId].correct++;
      else bySub[a.subcategoryId].wrongIds.push(a.questionId);
    }

    const subTitleMap: Record<string, string> = {};
    for (const sub of set.subcategories) subTitleMap[sub.id] = sub.title;

    const subStats = Object.entries(bySub)
      .map(([subId, v]) => ({
        subId,
        title: subTitleMap[subId] ?? subId,
        total: v.total,
        correct: v.correct,
        percent: v.total ? Math.round((v.correct / v.total) * 100) : 0,
        wrongIds: v.wrongIds
      }))
      .sort((a, b) => a.percent - b.percent);

    return { total, correct, percent, duration, subStats, weakest: subStats[0] ?? null };
  }, [attempt, set]);

  if (!category || !set) {
    return (
      <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
        <p>Results: set not found.</p>
        <button onClick={() => router.push("/")}>Home</button>
      </main>
    );
  }

  if (!attempt || !analysis) {
    return (
      <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
        <h1>Results</h1>
        <p>No attempt found. Finish a quiz first.</p>
        <button onClick={() => router.push("/")}>Home</button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 4 }}>Results — {set.title}</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Mode: <b>{attempt.mode}</b> · Time: <b>{formatTime(analysis.duration)}</b> · Session: <b>{attempt.wrongOnly ? "Incorrect-only" : "Full set"}</b>
      </p>

      <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Score</h2>
        <p style={{ fontSize: 18 }}>
          <b>{analysis.correct}</b> / <b>{analysis.total}</b> ({analysis.percent}%)
        </p>
      </section>

      <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Areas to Improve</h2>

        <div style={{ display: "grid", gap: 10 }}>
          {analysis.subStats.map((s) => (
            <div key={s.subId} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <b>{s.title}</b>
                <span>{s.correct}/{s.total} ({s.percent}%)</span>
              </div>
              {s.wrongIds.length > 0 && (
                <div style={{ marginTop: 6, opacity: 0.85 }}>
                  Wrong: {s.wrongIds.length}
                </div>
              )}
            </div>
          ))}
        </div>

        {analysis.weakest && (
          <p style={{ marginTop: 12 }}>
            Weakest: <b>{analysis.weakest.title}</b> ({analysis.weakest.percent}%)
          </p>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => router.push(`/quiz/${category.id}/${set.id}`)}
            style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #111", cursor: "pointer" }}
          >
            Retry Full Set
          </button>

          <button
            onClick={() => {
              const wrongIds = attempt.answers.filter((a) => !a.isCorrect).map((a) => a.questionId);
              sessionStorage.setItem("vetmcq_filter_wrongIds", JSON.stringify(wrongIds));
              router.push(`/quiz/${category.id}/${set.id}?wrongOnly=1`);
            }}
            style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd", cursor: "pointer" }}
          >
            Practice Incorrect Only
          </button>

          <button
            onClick={() => router.push("/")}
            style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd", cursor: "pointer" }}
          >
            Home
          </button>
        </div>
      </section>

      <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Review</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>#</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Subcategory</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Your</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Correct</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Mark</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Flag</th>
              </tr>
            </thead>
            <tbody>
              {attempt.answers.map((a, i) => (
                <tr key={a.questionId}>
                  <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>{i + 1}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                    {analysis.subStats.find((s) => s.subId === a.subcategoryId)?.title ?? a.subcategoryId}
                  </td>
                  <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>{a.selectedKey ?? "—"}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>{a.correctKey}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>{a.isCorrect ? "✅" : "❌"}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>{a.flagged ? "🚩" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
