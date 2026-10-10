/** Read-only skill chips, styled to sit on the solid highlight tile. */
export function SkillTags({ skills }: { skills: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <li key={skill} className="max-w-full rounded-sm bg-tile-ink/15 px-2 py-1 text-xs leading-none font-semibold break-words text-tile-ink">
          {skill}
        </li>
      ))}
    </ul>
  );
}
