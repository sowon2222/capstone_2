import React, { useState } from "react";

interface QuizProps {
  question: string;
  options: string;
  answer: string;
  explanation: string;
}

export default function QuizCard({ question, options, answer, explanation }: QuizProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const parsedOptions = options.split(/(?=A\.|B\.|C\.|D\.)/g).map(opt => opt.trim());

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
  };

  const isCorrect = selected && selected === answer;

  return (
    <div className="p-6 bg-[#1a1a1a] text-white rounded-lg shadow-lg max-w-2xl w-full">
      <h2 className="text-xl font-bold mb-4">{question}</h2>

      <div className="space-y-3 mb-4">
        {parsedOptions.map((opt, index) => (
          <button
            key={index}
            className={`w-full text-left px-4 py-3 border rounded transition ${
              submitted
                ? opt === answer
                  ? "bg-green-600 border-green-700"
                  : opt === selected
                  ? "bg-red-600 border-red-700"
                  : "bg-[#2a2a2a] border-[#444]"
                : selected === opt
                ? "bg-blue-600 border-blue-700"
                : "bg-[#2a2a2a] border-[#444]"
            }`}
            onClick={() => !submitted && setSelected(opt)}
            disabled={submitted}
          >
            {opt}
          </button>
        ))}
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded text-white"
          disabled={!selected}
        >
          정답 확인
        </button>
      ) : (
        <div className="mt-4 space-y-2">
          <div className={`text-lg font-semibold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
            {isCorrect ? "✅ 정답입니다!" : `❌ 오답입니다. 정답: ${answer}`}
          </div>
          <div className="text-gray-300">
            <strong>해설:</strong> {explanation}
          </div>
        </div>
      )}
    </div>
  );
}
