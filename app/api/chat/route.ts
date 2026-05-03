export const runtime = "edge";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: messages,
      stream: false,
    }),
  });

  const data = await response.json();
  const content = data.choices[0].message.content;

  return Response.json({ 
    id: "1",
    role: "assistant", 
    content: content,
    parts: [{ type: "text", text: content }]
  });
}