"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tripsApi, memosApi } from "@/lib/api";
import { Memo, TripDay } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const EMOTION_TAGS = ["😊", "😴", "🍽️", "📸", "😍", "🥵", "☔", "🎉"];

interface Props {
  tripId: string;
  memos: Memo[];
  days: TripDay[];
}

export default function MemoPanel({ tripId, memos, days }: Props) {
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string>("");

  const createMutation = useMutation({
    mutationFn: () =>
      tripsApi.createMemo(tripId, {
        content,
        tags: selectedTags,
        trip_day_id: selectedDayId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memos", tripId] });
      setContent("");
      setSelectedTags([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => memosApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memos", tripId] }),
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* 메모 작성 */}
      <div className="p-3 border-b shrink-0">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="지금 이 순간을 기록하세요..."
          rows={3}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
        />
        <div className="flex flex-wrap gap-1 my-2">
          {EMOTION_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`text-lg w-8 h-8 rounded-full transition ${
                selectedTags.includes(tag) ? "bg-yellow-100 ring-2 ring-yellow-400" : "hover:bg-gray-100"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            value={selectedDayId}
            onChange={(e) => setSelectedDayId(e.target.value)}
            className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none"
          >
            <option value="">날짜 선택 (선택사항)</option>
            {days.map((d, idx) => (
              <option key={d.id} value={d.id}>
                Day {idx + 1} — {format(new Date(d.date), "M월 d일", { locale: ko })}
              </option>
            ))}
          </select>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!content.trim() || createMutation.isPending}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </div>

      {/* 메모 목록 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {memos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center mt-8">메모를 작성해보세요</p>
        ) : (
          memos.map((memo) => (
            <div key={memo.id} className="bg-gray-50 rounded-xl p-3 group">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{memo.content}</p>
              {memo.tags && memo.tags.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {memo.tags.map((t) => (
                    <span key={t} className="text-base">{t}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">
                  {format(new Date(memo.created_at), "M.d HH:mm", { locale: ko })}
                </span>
                <button
                  onClick={() => deleteMutation.mutate(memo.id)}
                  className="text-xs text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
