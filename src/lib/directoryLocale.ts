import type { DirectoryPageSnapshot } from "@/lib/directorySnapshot";

export type LocalizedDirectoryMeta = {
  heading: string;
  title: string;
  description: string;
};

export function getLocalizedDirectoryMeta(snapshot: DirectoryPageSnapshot): LocalizedDirectoryMeta {
  return snapshot.pageMeta;
}

export function getLocalizedDirectoryIntro(): string {
  return "";
}
