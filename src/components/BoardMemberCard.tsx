"use client";

import { useState } from "react";
import type { BoardMember } from "@/data/content";

export default function BoardMemberCard({ member }: { member: BoardMember }) {
  const [imgError, setImgError] = useState(false);
  const showImage = member.imageUrl && !imgError;

  return (
    <div className="glass-card p-4 flex flex-col items-center text-center">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.imageUrl}
          alt={member.name}
          className="w-16 h-16 rounded-full object-cover mb-2"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="w-16 h-16 rounded-full mb-2 flex items-center justify-center"
          style={{ background: "rgba(var(--accent), 0.1)" }}
        >
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--accent-hex)" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
      <span className="text-xs font-semibold" style={{ color: "var(--accent-hex)" }}>{member.role}</span>
      <span className="text-sm font-semibold">{member.name}</span>
      {member.description && (
        <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>{member.description}</p>
      )}
    </div>
  );
}
