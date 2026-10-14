import "server-only";
import { cache } from "react";
import { listProjectOptions } from "@/server/services/projects";

/** Versões deduplicadas por request para uso em Server Components. */
export const getProjectOptions = cache(listProjectOptions);
