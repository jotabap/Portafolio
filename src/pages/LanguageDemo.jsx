import {useState} from 'react';

export default function LanguageDemo() {
    const [text, setText] = useState("");
    const [result, setResult] = useState(null);

    const analyzeText = async () => {
        const res=await fetch("/api/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text })
        });
        const data=await res.json();
        setResult(data);
    };
    return (
        <div className="container mx-auto py-6 px-4 md:px-8">
            <div className="max-w-lg mx-auto">
                <h1 className="text-2xl font-bold mb-4">Language Analyzer (Azure Language Service)</h1>
                <textarea
                    className="w-full border p-2 rounded mb-4"
                    rows="5"
                    placeholder="write your text here..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <button
                    onClick={analyzeText}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    Analyze
                </button>
                {result && (
                    <div className="mt-6 bg-gray-100 p-4 rounded">
                        <p><strong>Sentiment:</strong> {result.sentiment}</p>
                        <p><strong>Confidence Scores:</strong> {JSON.stringify(result.confidenceScores)}</p>
                        <p><strong>Key Words:</strong> {result.keywords.join(", ")}</p>
                        <p><strong>Summary:</strong> {result.summary.join(" ")}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
