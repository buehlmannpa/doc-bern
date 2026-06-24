"use client";

import { PortableText } from "@portabletext/react";
import { urlFor } from "../../sanity/lib/image";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InlineImage({ value }: { value: any }) {
  if (!value?.asset) return null;
  return (
    <figure className="my-4">
      <img
        src={urlFor(value).width(700).quality(80).url()}
        alt={value.alt || ""}
        className="w-full rounded-2xl"
        loading="lazy"
      />
      {value.caption && (
        <figcaption className="text-xs text-center mt-2" style={{ color: "var(--text-secondary)" }}>
          {value.caption}
        </figcaption>
      )}
    </figure>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InfoTable({ value }: { value: any }) {
  return (
    <div className="my-4 rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.03)" }}>
      {value.title && (
        <div className="px-4 py-2.5 font-semibold text-sm border-b border-black/5">
          {value.title}
        </div>
      )}
      <div className="divide-y divide-black/5">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {value.rows?.map((row: any, i: number) => (
          <div key={i} className="flex justify-between px-4 py-2 text-sm">
            <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
            <span className="font-medium">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const components = {
  types: {
    image: InlineImage,
    infoTable: InfoTable,
  },
  block: {
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-lg font-bold mt-5 mb-2">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-base font-bold mt-4 mb-1.5">{children}</h3>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote
        className="border-l-3 pl-4 my-3 italic text-sm"
        style={{ borderColor: "var(--accent-hex)", color: "var(--text-secondary)" }}
      >
        {children}
      </blockquote>
    ),
    normal: ({ children }: { children?: React.ReactNode }) => (
      <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-secondary)" }}>
        {children}
      </p>
    ),
  },
  marks: {
    link: ({ children, value }: { children: React.ReactNode; value?: { href: string } }) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline"
        style={{ color: "var(--accent-hex)" }}
      >
        {children}
      </a>
    ),
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PortableTextRenderer({ content }: { content: any[] }) {
  if (!content) return null;
  return <PortableText value={content} components={components} />;
}
