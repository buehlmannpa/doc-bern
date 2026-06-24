"use client";

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./sanity/schemaTypes";
import { apiVersion, dataset, projectId } from "./sanity/env";

export default defineConfig({
  basePath: "/studio",
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("DOC Bern CMS")
          .items([
            S.listItem()
              .title("Newsletter")
              .schemaType("newsletter")
              .child(
                S.documentTypeList("newsletter")
                  .title("Alle Newsletter-Beiträge")
                  .defaultOrdering([{ field: "publishedAt", direction: "desc" }])
              ),
            S.divider(),
            S.listItem()
              .title("Archivierte Beiträge")
              .child(
                S.documentList()
                  .title("Archiv")
                  .filter('_type == "newsletter" && isArchived == true')
                  .defaultOrdering([{ field: "publishedAt", direction: "desc" }])
              ),
          ]),
    }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
});
