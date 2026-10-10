type Props = {
  skills: string[];
  /** Skills currently switched off. */
  off: ReadonlySet<string>;
  /** `only` is true for a shift-click: keep just this skill. */
  onToggle: (skill: string, only: boolean) => void;
};

/** Skill chips that can each be switched on or off. */
export function SkillToggles({ skills, off, onToggle }: Props) {
  return (
    <ul aria-label="Skills to include in the link" className="flex flex-wrap gap-1.5">
      {skills.map((skill) => {
        const on = !off.has(skill);

        return (
          <li key={skill} className="max-w-full">
            {/* Off is shown with a strike-through and dashed outline, not color alone. */}
            <button
              type="button"
              aria-pressed={on}
              title={`${on ? "Click to leave this skill out" : "Click to include this skill"}. Shift-click to keep only this one.`}
              onClick={(event) => onToggle(skill, event.shiftKey)}
              className={`max-w-full cursor-pointer rounded-sm border px-2 py-1 text-left text-xs break-words select-none leading-none font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                on
                  ? "border-transparent bg-tag text-tag-ink hover:opacity-80"
                  : "border-dashed border-muted/60 text-muted line-through hover:text-ink"
              }`}
            >
              {skill}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
