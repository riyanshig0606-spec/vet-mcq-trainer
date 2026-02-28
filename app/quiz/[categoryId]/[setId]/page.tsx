"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import bankRaw from "../../../../data/questionBank.json";
import { AttemptAnswer, AttemptSummary, Mode, Question, QuestionBank } from "../../../../lib/types";
import { formatTime, shuffle } from "../../../../lib/utils";
import { saveAttempt } from "../../../../lib/storage";

type FlatQ = {
  question: Question;
  subcategoryId: string;
  subcategoryTitle: string;
};

export default function QuizPage() {
  const params = useParams<{ categoryId: string; setId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const bank = bankRaw as unknown as QuestionBank;

  const wrongOnly = searchParams.get("wrongOnly") === "1";

  const category = bank.categories.find((c) => c.id === params.categoryId);
  const set = category?.sets.find((s) => s.id === params.setId);

  const [mode, setMode] = useState<Mode>("practice");
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [timerEnabled, setTimerEnabled] = useState(false);

  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());

  const seedRef = useRef<number>(Date.now());

  const flatQuestions: FlatQ[] = useMemo(() => {
    if (!set) return [];
    const flat: FlatQ[] = [];
    for (const sub of set.subcategories) {
      for (const q of sub.questions) {
        flat.push({ question: q, subcategoryId: sub.id, subcategoryTitle: sub.title });
      }
    }
    return flat;
  }, [set]);

  const filteredQuestions: FlatQ[] = useMemo(() => {
    if (!wrongOnly) return flatQuestions;
    try {
      const raw = sessionStorage.getItem("vetmcq_filter_wrongIds");
      if (!raw) return flatQuestions;
      const wrongIds = new Set<string>(JSON.parse(raw));
      return flatQuestions.filter((fq) => wrongIds.has(fq.question.id));
    } catch {
      return flatQuestions;
    }
  }, [flatQuestions, wrongOnly]);

  const sessionQuestions = useMemo(() => {
    let list = [...filteredQuestions];
    if (shuffleQuestions) list = shuffle(list, seedRef.current);
    return list;
  }, [filteredQuestions, shuffleQuestions]);

  const total = sessionQuestions.length;

  const [idx, setIdx] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, AttemptAnswer>>({});

  const current = sessionQuestions[idx];

  useEffect(() => {
    if (!timerEnabled) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [timerEnabled]);

  useEffect(() => {
    setStartedAt(Date.now());
    setNow(Date.now());
    setIdx(0);
    setSelectedKey(null);
    setSubmitted(false);
    setFlagged({});
    setAnswers({});
    seedRef.current = Date.now();
  }, [params.categoryId, params.setId, wrongOnly]);

  if (!category || !set) {
    return (
      <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
        <p>Set not found. Check your data/questionBank.json.</p>
        <button onClick={() => router.push("/")}>Home</button>
      </main>
    );
  }

  if (total === 0) {
    return (
      <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
        <h1>{set.title}</h1>
        <p>No questions found for this session.</p>
        <button onClick={() => router.push(`/quiz/${category.id}/${set.id}`)}>Back</button>
        <button onClick={() => router.push("/")}>Home</button>
      </main>
    );
  }

  const isLast = idx === total - 1;

  function getShuffledOptions(q: Question) {
    if (!shuffleOptions) return q.options;
    const hash = Array.from(q.id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return shuffle(q.options, seedRef.current + hash);
  }

  function toggleFlag() {
    const qid = current.question.id;
    setFlagged((prev) => ({ ...prev, [qid]: !prev[qid] }));
  }

  function submitPractice() {
    if (!current || selectedKey == null) return;
    const correctKey = current.question.correctKey;
    const isCorrect = selectedKey === correctKey;

    const answer: AttemptAnswer = {
      questionId: current.question.id,
      subcategoryId: current.subcategoryId,
      selectedKey,
      correctKey,
      isCorrect,
      flagged: !!flagged[current.question.id]
    };
    setAnswers((prev) => ({ ...prev, [current.question.id]: answer }));
    setSubmitted(true);
  }

  function saveExamAnswer() {
    if (!current || selectedKey == null) return;
    if (answers[current.question.id]) return;

    const correctKey = current.question.correctKey;
    const isCorrect = selectedKey === correctKey;

    const answer: AttemptAnswer = {
      questionId: current.question.id,
      subcategoryId: current.subcategoryId,
      selectedKey,
      correctKey,
      isCorrect,
      flagged: !!flagged[current.question.id]
    };
    setAnswers((prev) => ({ ...prev, [current.question.id]: answer }));
  }

  function next() {
    setSubmitted(false);
    setSelectedKey(null);
    setIdx((i) => Math.min(total - 1, i + 1));
  }

  function prev() {
    setSubmitted(false);
    setSelectedKey(null);
    setIdx((i) => Math.max(0, i - 1));
  }

  function finishAndSave() {
    const finishedAt = Date.now();

    const finalAnswers: AttemptAnswer[] = sessionQuestions.map((fq) => {
      const existing = answers[fq.question.id];
      if (existing) return existing;
      return {
        questionId: fq.question.id,
        subcategoryId: fq.subcategoryId,
        selectedKey: null,
        correctKey: fq.question.correctKey,
        isCorrect: false,
        flagged: !!flagged[fq.question.id]
      };
    });

    const attempt: AttemptSummary = {
      attemptId: `att_${finishedAt}_${Math.random().toString(16).slice(2)}`,
      categoryId: category.id,
      setId: set.id,
      mode,
      shuffleQuestions,
      shuffleOptions,
      timerEnabled,
      wrongOnly,
      startedAt,
      finishedAt,
      answers: finalAnswers
    };

    saveAttempt(attempt);
    sessionStorage.setItem("vetmcq_lastAttempt", JSON.stringify(attempt));
    router.push(`/results/${category.id}/${set.id}`);
  }

  const options = getShuffledOptions(current.question);
  const showFeedback = mode === "practice" && submitted;
  const elapsed = timerEnabled ? now - startedAt : 0;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>
            {category.title} — {set.title} {wrongOnly ? "(Incorrect only)" : ""}
          </h1>
          <div style={{ opacity: 0.8 }}>
            Subcategory: <b>{current.subcategoryTitle}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {timerEnabled && (
            <div style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 10 }}>
              ⏱ {formatTime(elapsed)}
            </div>
          )}
          <div style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 10 }}>
            Q {idx + 1} / {total}
          </div>
        </div>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Question</h2>
          <button onClick={toggleFlag} style={{ border: "1px solid #ddd", borderRadius: 10, padding: "8px 10px" }}>
            {flagged[current.question.id] ? "🚩 Flagged" : "Flag"}
          </button>
        </div>

        <p style={{ fontSize: 16 }}>{current.question.stem}</p>

        <div style={{ display: "grid", gap: 10 }}>
          {options.map((opt) => {
            const isSelected = selectedKey === opt.key;
            const isCorrect = opt.key === current.question.correctKey;

            let border = "1px solid #ddd";
            let bg = "white";

            if (showFeedback) {
              if (isCorrect) {
                border = "2px solid #16a34a";
                bg = "#f0fdf4";
              } else if (isSelected && !isCorrect) {
                border = "2px solid #dc2626";
                bg = "#fef2f2";
              }
            } else if (isSelected) {
              border = "2px solid #111";
            }

            const locked =
              (mode === "practice" && submitted) ||
              (mode === "exam" && !!answers[current.question.id]);

            return (
              <button
                key={opt.key}
                onClick={() => {
                  if (locked) return;
                  setSelectedKey(opt.key);
                }}
                style={{
                  textAlign: "left",
                  border,
                  background: bg,
                  borderRadius: 12,
                  padding: 12,
                  cursor: locked ? "not-allowed" : "pointer",
                  opacity: locked && !isSelected ? 0.95 : 1
                }}
              >
                <b style={{ marginRight: 8 }}>{opt.key}.</b> {opt.text}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {mode === "practice" ? (
            <button
              onClick={submitPractice}
              disabled={selectedKey == null || submitted}
              style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #111", cursor: "pointer" }}
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={saveExamAnswer}
              disabled={selectedKey == null || !!answers[current.question.id]}
              style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #111", cursor: "pointer" }}
            >
              Save Answer
            </button>
          )}

          <button
            onClick={prev}
            disabled={idx === 0}
            style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd", cursor: "pointer" }}
          >
            Back
          </button>

          <button
            onClick={next}
            disabled={isLast}
            style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd", cursor: "pointer" }}
          >
            Next
          </button>

          <button
            onClick={finishAndSave}
            style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #111", cursor: "pointer", marginLeft: "auto" }}
          >
            Finish & See Results
          </button>
        </div>

        {showFeedback && (
          <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 12 }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>
              {selectedKey === current.question.correctKey ? "✅ Correct" : "❌ Incorrect"}
            </p>
            {current.question.explanationShort && (
              <p style={{ marginTop: 0 }}><b>Simple:</b> {current.question.explanationShort}</p>
            )}
            {current.question.explanationLong && (
              <p style={{ marginTop: 0 }}><b>Exam detail:</b> {current.question.explanationLong}</p>
            )}
          </div>
        )}
      </section>

      <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Session Settings</h3>

        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 130 }}>Mode</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} style={{ padding: 8, borderRadius: 10 }}>
              <option value="practice">Practice (instant feedback)</option>
              <option value="exam">Exam (feedback at end)</option>
            </select>
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} />
            Shuffle questions
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" checked={shuffleOptions} onChange={(e) => setShuffleOptions(e.target.checked)} />
            Shuffle options
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" checked={timerEnabled} onChange={(e) => setTimerEnabled(e.target.checked)} />
            Timer
          </label>
        </div>
      </section>
    </main>
  );
}
