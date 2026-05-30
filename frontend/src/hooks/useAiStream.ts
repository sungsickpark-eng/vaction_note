"use client";
import { useState, useCallback, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8003";

export interface AiDay {
  day: number;
  title: string;
  activities: string[];
}

interface UseAiStreamResult {
  text: string;
  parsedDays: AiDay[];
  loading: boolean;
  error: string;
  stream: (endpoint: string, body: object) => Promise<void>;
  reset: () => void;
}

/**
 * 스트리밍 완료 후 텍스트에서 Day 1 / Day 2 … 패턴을 파싱해 일정 추출.
 * 멀티라인 불릿(• 오전: ...) 및 슬래시(/ 오전: ...) 형식 모두 지원.
 */
function parseDaysFromText(text: string): AiDay[] {
  const days: AiDay[] = [];

  // "Day 1", "Day 2" 헤더를 기준으로 섹션 분리
  const sections = text.split(/(?=\*{0,2}Day\s+\d+[\s—–-])/i);

  for (const section of sections) {
    const headerMatch = section.match(/Day\s+(\d+)[\s—–-]+([^\n/]*)/i);
    if (!headerMatch) continue;

    const dayNum = parseInt(headerMatch[1]);
    const titleRaw = headerMatch[2].replace(/\*+/g, "").trim();

    let activities: string[] = [];

    // ── 방식 1: 멀티라인 불릿 (• 오전: ..., • 오후: ...) ──────────────────
    const bulletLines = section
      .split("\n")
      .filter((l) => /^\s*[•\-·]/.test(l))
      .map((l) => l.replace(/^\s*[•\-·]\s*/, "").trim())
      .filter((l) => l.length > 2);

    if (bulletLines.length > 0) {
      activities = bulletLines.slice(0, 6);
    } else {
      // ── 방식 2: 슬래시 구분 (Day N — 제목 / 오전: ... / 오후: ...) ──────
      const fullLine = section.replace(/\n/g, " ").trim();
      const slashParts = fullLine.split("/")
        .slice(1) // 제목 부분 제외
        .map((p) => p.trim())
        .filter((p) => p.length > 2);

      if (slashParts.length > 0) {
        activities = slashParts.slice(0, 6);
      } else {
        // ── 방식 3: 오전/오후/저녁 키워드 직접 추출 ──────────────────────
        const timePattern = /(오전|오후|저녁|낮|밤)[:\s：]([^\n/]{3,60})/g;
        let m;
        while ((m = timePattern.exec(section)) !== null) {
          activities.push(`${m[1]}: ${m[2].trim()}`);
          if (activities.length >= 6) break;
        }
      }
    }

    if (activities.length === 0) continue;

    days.push({
      day: dayNum,
      title: titleRaw || `Day ${dayNum}`,
      activities,
    });
  }

  return days.sort((a, b) => a.day - b.day);
}

export function useAiStream(): UseAiStreamResult {
  const [text, setText] = useState("");
  const [parsedDays, setParsedDays] = useState<AiDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const stream = useCallback(async (endpoint: string, body: object) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

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
          if (line.startsWith(":")) continue;         // SSE 주석(keep-alive) 무시
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.ping) continue;
            if (parsed.text) {
              accumulated += parsed.text;
              // 실시간으로도 [PLAN] 블록 숨김
              const visible = accumulated.replace(/\[PLAN\][\s\S]*?\[\/PLAN\]/g, "").trimEnd();
              setText(visible || accumulated);
            }
          } catch {}
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setError(e.message || "AI 응답을 가져오지 못했습니다");
      }
    } finally {
      // [PLAN]...[/PLAN] 블록 제거 (구버전 백엔드 호환)
      const cleaned = accumulated.replace(/\[PLAN\][\s\S]*?\[\/PLAN\]/g, "").trimEnd();
      setText(cleaned);
      if (cleaned) setParsedDays(parseDaysFromText(cleaned));
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setText("");
    setParsedDays([]);
    setError("");
    setLoading(false);
  }, []);

  return { text, parsedDays, loading, error, stream, reset };
}
