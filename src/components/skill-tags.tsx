// `tile` is for sitting on a solid highlight block, where the default tag color
// would blend into the background.
const TONE = {
  default: "bg-tag text-tag-ink",
  tile: "bg-tile-ink/15 text-tile-ink",
} as const;

export function SkillTags({ skills, tone = "default" }: { skills: string[]; tone?: keyof typeof TONE }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <li key={skill} className={`rounded-sm px-2 py-1 text-xs leading-none font-semibold ${TONE[tone]}`}>
          {skill}
        </li>
      ))}
    </ul>
  );
}
