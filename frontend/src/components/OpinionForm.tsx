import { useState } from "react";
import { submitOpinion } from "../lib/api";

export function OpinionForm() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Macro");
  const [sentiment, setSentiment] = useState("bull");
  const [threshold, setThreshold] = useState(60);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!title.trim()) {
      setStatus("Please enter a title");
      return;
    }
    submitOpinion({ title, category, sentiment, threshold })
      .then(() => {
        setStatus("Submitted. Backend will refresh and include it.");
        setTitle("");
      })
      .catch((err) => {
        console.error(err);
        setStatus("Submit failed, please retry later");
      });
  };

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-3">
      <p className="text-sm text-white/70">Submit your view or alert condition. Backend will aggregate and publish.</p>
      <div>
        <label className="text-xs text-white/60">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none placeholder:text-white/40"
          placeholder="e.g., Fed holds rates at 65% probability"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/60">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-white/60">Sentiment</label>
          <select
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value)}
            className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white bg-[#0B1021]"
          >
            <option value="bull">Bullish</option>
            <option value="bear">Bearish</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-white/60">Trigger probability (%)</label>
        <input
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
        />
      </div>
      <button
        onClick={handleSubmit}
        className="w-full rounded-lg bg-gradient-to-r from-primary to-primary-100 text-[#0B1021] font-semibold py-3 shadow-glass hover:scale-[1.01] transition"
      >
        Submit
      </button>
      {status && <p className="text-sm text-white/70">{status}</p>}
    </div>
  );
}
