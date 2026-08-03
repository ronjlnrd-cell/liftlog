import { useEffect, useState } from "react";
import {
  getExerciseIllustration,
  getExerciseIllustrationPlaceholder,
  type ExerciseIllustrationResult,
} from "../assets/exercises/getExerciseIllustration";

type ExerciseIllustrationProps = {
  exerciseId: string;
  className?: string;
};

export function ExerciseIllustration({
  exerciseId,
  className,
}: ExerciseIllustrationProps) {
  const [illustration, setIllustration] = useState<ExerciseIllustrationResult>(
    () => getExerciseIllustrationPlaceholder(),
  );

  useEffect(() => {
    let cancelled = false;

    setIllustration(getExerciseIllustrationPlaceholder());

    void getExerciseIllustration(exerciseId).then((result) => {
      if (!cancelled) {
        setIllustration(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  const classNames = ["exercise-illustration", className]
    .filter(Boolean)
    .join(" ");

  return (
    <figure className={classNames}>
      <img
        src={illustration.src}
        alt=""
        loading="lazy"
        decoding="async"
        className={illustration.isPlaceholder ? "is-placeholder" : undefined}
      />
    </figure>
  );
}
