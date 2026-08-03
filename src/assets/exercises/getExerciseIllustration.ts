import placeholderUrl from "./placeholder.svg?url";

export type ExerciseIllustrationResult = {
  src: string;
  isPlaceholder: boolean;
};

const illustrationLoaders = import.meta.glob<string>(
  ["./*.svg", "./*.png", "!./placeholder.svg"],
  {
    query: "?url",
    import: "default",
  },
);

const placeholderResult: ExerciseIllustrationResult = {
  src: placeholderUrl,
  isPlaceholder: true,
};

function illustrationKey(exerciseId: string, extension: "svg" | "png"): string {
  return `./${exerciseId}.${extension}`;
}

export function hasExerciseIllustration(exerciseId: string): boolean {
  return (
    illustrationKey(exerciseId, "svg") in illustrationLoaders ||
    illustrationKey(exerciseId, "png") in illustrationLoaders
  );
}

export async function getExerciseIllustration(
  exerciseId: string,
): Promise<ExerciseIllustrationResult> {
  for (const extension of ["svg", "png"] as const) {
    const key = illustrationKey(exerciseId, extension);
    const loader = illustrationLoaders[key];
    if (!loader) continue;

    try {
      const src = await loader();
      if (src) {
        return { src, isPlaceholder: false };
      }
    } catch {
      // Missing or failed assets fall through to the placeholder.
    }
  }

  return placeholderResult;
}

export function getExerciseIllustrationPlaceholder(): ExerciseIllustrationResult {
  return placeholderResult;
}
