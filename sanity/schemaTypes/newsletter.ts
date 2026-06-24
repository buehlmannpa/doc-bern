import { defineField, defineType } from "sanity";

export const newsletter = defineType({
  name: "newsletter",
  title: "Newsletter",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Titel",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "publishedAt",
      title: "Veröffentlicht am",
      type: "datetime",
      validation: (rule) => rule.required(),
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "category",
      title: "Kategorie",
      type: "string",
      options: {
        list: [
          { title: "Neuigkeit", value: "news" },
          { title: "Bericht", value: "report" },
          { title: "Interview", value: "interview" },
          { title: "Update", value: "update" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
      initialValue: "news",
    }),
    defineField({
      name: "summary",
      title: "Zusammenfassung",
      description: "Kurze Zusammenfassung für die Vorschau (1-2 Sätze)",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required().max(300),
    }),
    defineField({
      name: "coverImage",
      title: "Titelbild",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt-Text",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "content",
      title: "Inhalt",
      type: "array",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "Überschrift 2", value: "h2" },
            { title: "Überschrift 3", value: "h3" },
            { title: "Zitat", value: "blockquote" },
          ],
          marks: {
            decorators: [
              { title: "Fett", value: "strong" },
              { title: "Kursiv", value: "em" },
              { title: "Unterstrichen", value: "underline" },
            ],
            annotations: [
              {
                name: "link",
                title: "Link",
                type: "object",
                fields: [
                  {
                    name: "href",
                    title: "URL",
                    type: "url",
                  },
                ],
              },
            ],
          },
        },
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "alt",
              title: "Alt-Text",
              type: "string",
            }),
            defineField({
              name: "caption",
              title: "Bildunterschrift",
              type: "string",
            }),
          ],
        },
        {
          name: "infoTable",
          title: "Info-Tabelle",
          type: "object",
          fields: [
            defineField({
              name: "title",
              title: "Tabellen-Titel",
              type: "string",
            }),
            defineField({
              name: "rows",
              title: "Zeilen",
              type: "array",
              of: [
                {
                  type: "object",
                  fields: [
                    defineField({
                      name: "label",
                      title: "Bezeichnung",
                      type: "string",
                    }),
                    defineField({
                      name: "value",
                      title: "Wert",
                      type: "string",
                    }),
                  ],
                  preview: {
                    select: { title: "label", subtitle: "value" },
                  },
                },
              ],
            }),
          ],
          preview: {
            select: { title: "title" },
            prepare({ title }) {
              return { title: title || "Info-Tabelle" };
            },
          },
        },
      ],
    }),
    defineField({
      name: "isArchived",
      title: "Archiviert (Ungültig)",
      description: "Markiert den Beitrag als ungültig und verschiebt ihn ins Archiv",
      type: "boolean",
      initialValue: false,
    }),
  ],
  orderings: [
    {
      title: "Datum (neueste zuerst)",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "category",
      media: "coverImage",
      archived: "isArchived",
    },
    prepare({ title, subtitle, media, archived }) {
      const categoryMap: Record<string, string> = {
        news: "Neuigkeit",
        report: "Bericht",
        interview: "Interview",
        update: "Update",
      };
      return {
        title: `${archived ? "📦 " : ""}${title}`,
        subtitle: `${categoryMap[subtitle] || subtitle}${archived ? " · Archiviert" : ""}`,
        media,
      };
    },
  },
});
