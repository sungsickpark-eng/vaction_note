"use client";
import { useState, useCallback, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8003";

export interface AiDay {
  day: number;
  title: string;
  activities: string[];
}

interface UseAiStreamResult {
  text: string;           // [PLAN]...[/PLAN] 제거된 표시용 텍스트
  rawText: string;        // 원본 전체 텍스트
  parsedDays: AiDay[];    // 파싱된 일별 일정
  loading: boolean;
  error: string;
  stream: (endpoint: string, body: object) => Promise<void>;
  reset: () => void;
}

/** [PLAN]{...}[/PLAN] 블록을 추출하고 제거 */
function extractPlan(raw: string): { clean: string; days: AiDay[] } {
  const match = raw.match(/\[PLAN\]([\s\S]*?)\[\/PLAN\]/);
  if (!match) return { clean: raw, days: [] };

  try {
    const json = JSON.parse(match[1].trim());
    const days: AiDay[] = (json.days ?? []).map((d: AiDay) => ({
      day: d.day,
      title: d.title || `Day ${d.day}`,
      activities: Array.isArray(d.activities) ? d.activities : [],
    }));
    const clean = raw.replace(/\[PLAN\][\s\S]*?\[\/PLAN\]/, "").trimEnd();
    return { clean, days };
  } catch {
    return { clean: raw, days: [] };
  }
}

export function useAiStream(): UseAiStreamResult {
  const [rawText, setRawText] = useState("");
  const [text, setText] = useState("");
  const [parsedDays, setParsedDays] = useState<AiDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const stream = useCallback(async (endpoint: string, body: object) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setRawText("");
    setText("");
    setParsedDays([]);
    setError("");
    setLoading(true);

    let accumulated = "";

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `오류: ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          // SSE 주석 (keep-alive) 무시
          if (line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw);
            // ping 무시
            if (parsed.ping) continue;
            if (parsed.text) {
              accumulated += parsed.text;
              setRawText(accumulated);
              // 실시간으로 [PLAN] 블록은 숨기고 표시
              const { clean } = extractPlan(accumulated);
              setText(clean);
            }
          } catch {}
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setError(e.message || "AI 응답을 가져오지 못했습니다");
      }
    } finally {
      // 스트리밍 완료 후 JSON 파싱
      const { clean, days } = extractPlan(accumulated);
      setText(clean);
      setParsedDays(days);
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setRawText("");
    setText("");
    setParsedDays([]);
    setError("");
    setLoading(false);
  }, []);

  return { text, rawText, parsedDays, loading, error, stream, reset };
}
