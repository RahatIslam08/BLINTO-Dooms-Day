import { useEffect, useState } from "react";
import { api } from "./services/api";

function AppShell({ active, setActive, children }) {
  const tabs = [
    ["movies", "Movies"],
    ["rewatch", "Rewatch Plan"],
    ["booking", "Booking"],
  ];
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <button className="text-left" onClick={() => setActive("movies")}>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber">Blinto</p>
            <p className="text-lg font-black text-white">Doomsday Ready</p>
          </button>
          <nav className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition sm:px-5 sm:text-sm ${
                  active === id ? "bg-amber text-black" : "text-zinc-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-amber";
const buttonClass = "rounded-xl bg-amber px-4 py-3 text-sm font-black text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40";

function ErrorNotice({ error }) {
  if (!error) return null;
  return <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>;
}

function MoviesPage() {
  const empty = { title: "", releaseYear: new Date().getFullYear(), runtime: 120, prerequisites: [], watched: false };
  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try { setMovies(await api.movies.list()); } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const body = { ...form, releaseYear: Number(form.releaseYear), runtime: Number(form.runtime), prerequisites: form.prerequisites };
      if (editing) await api.movies.update(editing, body);
      else await api.movies.create(body);
      setForm(empty);
      setEditing(null);
      await load();
    } catch (e) { setError(e.message); }
  }

  function edit(movie) {
    setEditing(movie._id);
    setForm({
      title: movie.title,
      releaseYear: movie.releaseYear,
      runtime: movie.runtime,
      prerequisites: movie.prerequisites.map((item) => typeof item === "string" ? item : item._id),
      watched: movie.watched,
    });
  }

  async function toggle(movie) {
    try {
      await api.movies.update(movie._id, { watched: !movie.watched });
      await load();
    } catch (e) { setError(e.message); }
  }

  async function remove(movie) {
    try { await api.movies.remove(movie._id); await load(); } catch (e) { setError(e.message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section className="card h-fit">
        <h1 className="section-title">{editing ? "Edit movie" : "Add movie"}</h1>
        <ErrorNotice error={error} />
        <form onSubmit={submit} className="space-y-4">
          <label className="field">Title<input className={inputClass} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="field">Release year<input className={inputClass} type="number" required value={form.releaseYear} onChange={(e) => setForm({ ...form, releaseYear: e.target.value })} /></label>
            <label className="field">Runtime (min)<input className={inputClass} type="number" min="1" max="300" required value={form.runtime} onChange={(e) => setForm({ ...form, runtime: e.target.value })} /></label>
          </div>
          <label className="field">
            Prerequisites
            <select multiple className={`${inputClass} h-32`} value={form.prerequisites} onChange={(e) => setForm({ ...form, prerequisites: [...e.target.selectedOptions].map((option) => option.value) })}>
              {movies.filter((movie) => movie._id !== editing).map((movie) => <option key={movie._id} value={movie._id}>{movie.title}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm font-bold text-zinc-300"><input type="checkbox" checked={form.watched} onChange={(e) => setForm({ ...form, watched: e.target.checked })} />Already watched</label>
          <div className="flex gap-3">
            <button className={buttonClass} type="submit">{editing ? "Save changes" : "Create movie"}</button>
            {editing && <button type="button" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-zinc-300" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</button>}
          </div>
        </form>
      </section>
      <section>
        <div className="mb-4 flex items-end justify-between"><h1 className="section-title">Movie library</h1><span className="text-sm text-zinc-500">{movies.length} titles</span></div>
        <ErrorNotice error={error} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {movies.map((movie) => (
            <article key={movie._id} className="card group">
              <div className="mb-4 flex items-start justify-between">
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${movie.watched ? "bg-emerald-400/15 text-emerald-300" : "bg-amber/15 text-amber"}`}>{movie.watched ? "Watched" : "Pending"}</span>
                <span className="text-xs text-zinc-500">{movie.runtime} min</span>
              </div>
              <h2 className="text-lg font-black text-white">{movie.title}</h2>
              <p className="mt-1 text-sm text-zinc-500">{movie.releaseYear} · {movie.prerequisites.length} prerequisite(s)</p>
              <div className="mt-5 flex gap-2">
                <button className="small-button" onClick={() => edit(movie)}>Edit</button>
                <button className="small-button" onClick={() => toggle(movie)}>{movie.watched ? "Mark pending" : "Mark watched"}</button>
                <button className="small-button text-red-300" onClick={() => remove(movie)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function RewatchPage() {
  const [movies, setMovies] = useState([]);
  const [target, setTarget] = useState("");
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.movies.list().then(setMovies).catch((e) => setError(e.message)); }, []);
  async function loadPlan(id) {
    setTarget(id); setError("");
    if (!id) { setPlan(null); return; }
    try { setPlan(await api.movies.rewatch(id)); } catch (e) { setError(e.message); setPlan(null); }
  }
  return (
    <section className="mx-auto max-w-4xl">
      <div className="card">
        <h1 className="section-title">Build a rewatch plan</h1>
        <select className={inputClass} value={target} onChange={(e) => loadPlan(e.target.value)}>
          <option value="">Select a target movie</option>
          {movies.map((movie) => <option key={movie._id} value={movie._id}>{movie.title}</option>)}
        </select>
        <ErrorNotice error={error} />
      </div>
      {plan && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="stat"><span>Prerequisites</span><strong>{plan.prerequisites.length}</strong></div>
          <div className="stat"><span>Watched</span><strong>{plan.watchedCount}</strong></div>
          <div className="stat"><span>Remaining runtime</span><strong>{plan.remainingRuntime} min</strong></div>
          <div className="sm:col-span-3">
            {plan.prerequisites.length === 0 ? <div className="card text-zinc-400">No prerequisites required.</div> :
              <ol className="space-y-2">{plan.prerequisites.map((movie, index) => (
                <li key={movie._id} className="card flex items-center gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber text-sm font-black text-black">{index + 1}</span>
                  <div className="min-w-0 flex-1"><p className="font-black text-white">{movie.title}</p><p className="text-xs text-zinc-500">{movie.runtime} min · {movie.releaseYear}</p></div>
                  <span className={movie.watched ? "text-emerald-300" : "text-zinc-500"}>{movie.watched ? "Watched" : "Pending"}</span>
                </li>
              ))}</ol>}
          </div>
        </div>
      )}
    </section>
  );
}

function BookingPage() {
  const [cinemas, setCinemas] = useState([]);
  const [cinemaId, setCinemaId] = useState("");
  const [groupSize, setGroupSize] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.cinemas.list().then(setCinemas).catch((e) => setError(e.message)); }, []);
  async function calculate(event) {
    event.preventDefault(); setError(""); setResult(null);
    try { setResult(await api.cinemas.booking(cinemaId, Number(groupSize))); } catch (e) { setError(e.message); }
  }
  return (
    <section className="mx-auto max-w-3xl">
      <div className="card">
        <h1 className="section-title">Find the best bundle mix</h1>
        <ErrorNotice error={error} />
        <form onSubmit={calculate} className="grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <label className="field">Cinema<select className={inputClass} required value={cinemaId} onChange={(e) => setCinemaId(e.target.value)}><option value="">Select cinema</option>{cinemas.map((cinema) => <option key={cinema._id} value={cinema._id}>{cinema.name}</option>)}</select></label>
          <label className="field">Group size<input className={inputClass} type="number" min="1" max="10000" required value={groupSize} onChange={(e) => setGroupSize(e.target.value)} /></label>
          <button className={buttonClass}>Calculate</button>
        </form>
      </div>
      {result && (
        result.impossible ? <div className="mt-6 card border-red-500/30 text-red-300">Exact booking is impossible with these bundle sizes.</div> :
        <div className="mt-6 card shadow-glow">
          <p className="text-sm font-bold text-zinc-500">{result.cinemaName} · {result.groupSize} people</p>
          <div className="mt-2 text-5xl font-black text-white">{result.minimumBundles}<span className="ml-2 text-lg text-zinc-500">bundles</span></div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(result.bundleQuantities).map(([size, quantity]) => (
              <div key={size} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><strong className="text-2xl text-amber">{quantity}×</strong><p className="text-sm text-zinc-400">{size}-person bundle</p></div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [active, setActive] = useState("movies");
  return (
    <AppShell active={active} setActive={setActive}>
      {active === "movies" && <MoviesPage />}
      {active === "rewatch" && <RewatchPage />}
      {active === "booking" && <BookingPage />}
    </AppShell>
  );
}
