"use client";
import { useSearchParams } from 'next/navigation';
import { useState } from "react";

const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto",
  "Septiembre", "Octubre", "Noviembre", "Diciembre"
]
const templates = [
  (chapter) => `🗓️Miercoles ${chapter.date.getDate()} de ${months[chapter.date.getMonth()]}🗓️

18:30Hs 🇦🇷
16:30Hs 🇨🇴
22:30Hs 🇪🇸

Tenemos nuevo capitulo!

${chapter.topic}

Los esperamos! 🔥`,
  (chapter) => `HOY🗓️

18:30Hs 🇦🇷 - 16:30Hs 🇨🇴 - 22:30Hs 🇪🇸

hablamos ${chapter.description}!

nos vemos! 👋`
];

export default function Home() {
  const searchParam = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [tweets = [], setTweets] = useState(
    templates.map((template) => ({
      text: template({
        topic: searchParam?.get('topic'),
        date: new Date(Number(searchParam?.get('date'))),
        description: searchParam?.get('description') 
      }),
      date: new Date().toISOString().slice(0, 16)
    }))
  );
  const handleSave = async (tweet) => {
    setLoading(true);
    await fetch("/api/tweet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(tweet)
    }).finally(() => setLoading(false));
    alert('Tweet saved!');
  }
  return (
    <main className="flex min-h-screen flex-col items-center py-24 px-4 gap-12">
      {tweets.map((tweet, index) => (
        <div
          key={index}
          className="w-full h-96 max-w-[800px] flex flex-col items-center justify-center gap-2 text-black"
        >
          <textarea
            name="tweet"
            className="w-full h-96 border rounded-lg p-2"
            value={tweet.text}
            onChange={(e) => {
              setTweets((prev) => {
                const newTweets = [...prev];
                newTweets[index].text = e.target.value;
                return newTweets;
              });
            }}
          ></textarea>
          <div className="w-full flex items-center justify-between">
            <input
              type="datetime-local"
              className="border rounded-lg p-2"
              value={tweet.date}
              onChange={(e) => {
                setTweets((prev) => {
                  const newTweets = [...prev];
                  newTweets[index].date = e.target.value;
                  return newTweets;
                });
              }}
            />
            <input type="hidden" id="timezone" name="timezone" value="-03:00" />
            <button
              className="px-6 py-2 text-white border rounded-lg bg-balance self-end disabled:opacity-50"
              disabled={tweet.text.length > 280 || loading}
              onClick={() => handleSave(tweet)}
            >
              Save
              <span className="text-sm"> ({tweet.text.length} / 280)</span>
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}
