import Link from "next/link";
import bank from "../data/questionBank.json";

export default function Home() {
  const categories = bank.categories;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 30, marginBottom: 6 }}>Vet MCQ Trainer</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Choose a category and set. Practice mode gives instant feedback; exam mode reveals answers at the end.
      </p>

      <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
        {categories.map((cat) => (
          <section key={cat.id} style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <h2 style={{ margin: 0 }}>{cat.title}</h2>
              <span style={{ opacity: 0.7 }}>{cat.sets.length} set(s)</span>
            </div>

            {cat.sets.length === 0 ? (
              <p style={{ opacity: 0.7, marginBottom: 0 }}>No sets yet. Add sets in data/questionBank.json</p>
            ) : (
              <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18 }}>
                {cat.sets.map((set) => (
                  <li key={set.id} style={{ marginBottom: 8 }}>
                    <Link href={`/quiz/${cat.id}/${set.id}`} style={{ textDecoration: "underline" }}>
                      {set.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
