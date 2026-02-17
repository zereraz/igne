import type { Message } from './aiService';

const MAX_CONTENT = 8000;

function truncate(text: string): string {
  if (text.length <= MAX_CONTENT) return text;
  return text.slice(0, MAX_CONTENT) + '\n\n[...truncated]';
}

export function summarizePrompt(noteContent: string): Message[] {
  return [
    { role: 'system', content: 'You are a concise note summarizer. Output a short markdown summary with bullet points. No preamble.' },
    { role: 'user', content: `Summarize this note:\n\n${truncate(noteContent)}` },
  ];
}

export function continuePrompt(noteContent: string): Message[] {
  return [
    { role: 'system', content: 'You are a writing assistant. Continue the text naturally in the same style and tone. Output only the continuation — no preamble, no repetition of existing text.' },
    { role: 'user', content: `Continue this text:\n\n${truncate(noteContent)}` },
  ];
}

export function fixPrompt(selection: string): Message[] {
  return [
    { role: 'system', content: 'You are an editor. Fix grammar, spelling, and clarity. Return only the corrected text, preserving all markdown formatting. No explanations.' },
    { role: 'user', content: `Fix this text:\n\n${selection}` },
  ];
}

export function askPrompt(noteContent: string, question: string): Message[] {
  return [
    { role: 'system', content: 'You are a knowledgeable assistant. Answer the question based on the note content. Output concise markdown. If the note doesn\'t contain enough info, say so.' },
    { role: 'user', content: `Note:\n\n${truncate(noteContent)}\n\nQuestion: ${question}` },
  ];
}
