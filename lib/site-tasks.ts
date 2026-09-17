// Group a sorted task list by category, keeping first-appearance order so the
// list reads as the visit flows (Arrival → Water quality → … → Departure).
export function groupByCategory<T extends { category?: string | null }>(tasks: T[]): { category: string; tasks: T[] }[] {
  const groups: { category: string; tasks: T[] }[] = []
  for (const t of tasks) {
    const category = t.category?.trim() || 'General'
    let g = groups.find(x => x.category === category)
    if (!g) { g = { category, tasks: [] }; groups.push(g) }
    g.tasks.push(t)
  }
  return groups
}
