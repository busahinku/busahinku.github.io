import type { CollectionEntry } from "astro:content";
import type { ImageMetadata } from "astro";
import type { Lang } from "../i18n/translations";

export type ProjectEntry = CollectionEntry<"projects">;

const projectCovers = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/projects/*/cover.{png,jpg,jpeg,webp,avif}",
  { eager: true },
);

export function getProjectSlug(project: ProjectEntry): string {
  return project.data.translationKey ?? project.id;
}

export function getProjectCover(slug: string): ImageMetadata | undefined {
  const coverPath = Object.keys(projectCovers).find((path) =>
    path.match(new RegExp(`/projects/${slug}/cover\\.(png|jpe?g|webp|avif)$`)),
  );

  return coverPath ? projectCovers[coverPath].default : undefined;
}

export function getLocalizedProjects(
  projects: ProjectEntry[],
  lang: Lang,
): ProjectEntry[] {
  const localized = new Map<string, ProjectEntry>();

  for (const project of projects) {
    if (project.data.lang === "en") {
      localized.set(getProjectSlug(project), project);
    }
  }

  if (lang === "tr") {
    for (const project of projects) {
      if (project.data.lang === "tr") {
        localized.set(getProjectSlug(project), project);
      }
    }
  }

  return [...localized.values()];
}
