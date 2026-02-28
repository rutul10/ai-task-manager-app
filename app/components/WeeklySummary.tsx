"use client";

import { useState } from "react";

export default function WeeklySummary() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const res = await fetch("/api/ai/summary");
    const data = await res.json();
    setSummary(data.summary);
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-800">Weekly Summary</h2>
          <p className="text-xs text-gray-400">AI-generated overview of your tasks</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>
      {summary && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
          {summary}
        </div>
      )}
    </div>
  );
}