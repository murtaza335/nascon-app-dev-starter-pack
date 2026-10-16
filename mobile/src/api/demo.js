// Contract-shaped local service. Swap this boundary for HTTP when endpoints are ready.
const priorities = ['low', 'medium', 'high'];
const dateKey = (date) => date.toISOString().slice(0, 10);
const day = (offset) => { const date = new Date(); date.setUTCDate(date.getUTCDate() + offset); return dateKey(date); };

function apiError(code, message, details = []) {
  return Object.assign(new Error(message), { code, details });
}

function validateTodo(input, partial = false) {
  const details = [];
  const allowed = ['title', 'description', 'priority', 'due_date', ...(partial ? ['completed'] : [])];
  for (const field of Object.keys(input)) if (!allowed.includes(field)) details.push({ field, message: `${field} is not accepted` });
  if (!partial || 'title' in input) {
    if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 200) details.push({ field: 'title', message: 'Enter a title between 1 and 200 characters.' });
  }
  if ('description' in input && (typeof input.description !== 'string' || input.description.length > 1000)) details.push({ field: 'description', message: 'Description must be 1,000 characters or fewer.' });
  if ('priority' in input && !priorities.includes(input.priority)) details.push({ field: 'priority', message: 'Choose low, medium, or high priority.' });
  if ('completed' in input && typeof input.completed !== 'boolean') details.push({ field: 'completed', message: 'Completed must be true or false.' });
  if ('due_date' in input && input.due_date !== null) {
    const value = input.due_date;
    const parsed = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
    if (!parsed || Number.isNaN(parsed.valueOf()) || dateKey(parsed) !== value) details.push({ field: 'due_date', message: 'Enter a valid calendar date as YYYY-MM-DD.' });
  }
  if (partial && !Object.keys(input).length) details.push({ field: 'body', message: 'Provide at least one change.' });
  if (details.length) throw apiError('VALIDATION_ERROR', 'Validation failed', details);
  return { ...input, ...('title' in input ? { title: input.title.trim() } : {}) };
}

function seedTodos() {
  const examples = [
    ['Polish the project presentation', 'Bring the story together. Keep it clear, thoughtful, and focused.', 'high', 0, false],
    ['Make time for a little movement', 'A 30-minute walk, a fresh perspective.', 'medium', 0, false],
    ['Review the weekly budget', 'Check spending and plan for the week ahead.', 'high', -1, false],
    ['Read a chapter of your book', 'Step away from the screen and into a good story.', 'low', 1, false],
    ['Plan the week ahead', 'Choose a few priorities that really matter.', 'medium', 2, false],
    ['Clear your workspace', 'A little less clutter, a little more clarity.', 'low', 0, true],
    ['Send the project update', 'Share progress and next steps with the team.', 'medium', 0, true],
    ['Start the day with intention', 'Write down one thing you want to make space for.', 'low', 0, true],
  ];
  return examples.map(([title, description, priority, offset, completed], index) => ({ id: index + 1, title, description, priority, due_date: day(offset), completed, created_at: new Date(Date.now() - index * 60000).toISOString(), updated_at: new Date().toISOString() }));
}

function createDemoService(initial = seedTodos()) {
  let todos = initial.map((todo) => ({ ...todo }));
  let nextId = Math.max(0, ...todos.map((todo) => todo.id)) + 1;
  const find = (id) => { const todo = todos.find((item) => item.id === id); if (!todo) throw apiError('NOT_FOUND', 'Todo not found'); return todo; };
  return {
    async list(params = {}) {
      let items = todos.filter((todo) => (params.completed === undefined || todo.completed === (params.completed === 'true')) && (!params.priority || todo.priority === params.priority) && (!params.q || `${todo.title} ${todo.description}`.toLowerCase().includes(params.q.toLowerCase())));
      const sort = params.sort || 'created_at'; const sign = params.order === 'asc' ? 1 : -1;
      items.sort((a, b) => {
        if (sort === 'due_date' && (a.due_date === null || b.due_date === null)) return a.due_date === b.due_date ? a.id - b.id : a.due_date === null ? 1 : -1;
        const comparison = sort === 'priority' ? priorities.indexOf(a.priority) - priorities.indexOf(b.priority) : String(a[sort]).localeCompare(String(b[sort]));
        return comparison * sign || a.id - b.id;
      });
      const page = params.page || 1; const limit = params.limit || 20;
      return { items: items.slice((page - 1) * limit, page * limit).map((item) => ({ ...item })), page, limit, total: items.length, total_pages: Math.ceil(items.length / limit) };
    },
    async stats() { return { stats: { total: todos.length, completed: todos.filter((todo) => todo.completed).length, pending: todos.filter((todo) => !todo.completed).length, overdue: todos.filter((todo) => !todo.completed && todo.due_date && todo.due_date < day(0)).length } }; },
    async create(input) { const fields = validateTodo(input); const timestamp = new Date().toISOString(); const todo = { id: nextId++, title: fields.title, description: fields.description ?? '', priority: fields.priority ?? 'medium', due_date: fields.due_date ?? null, completed: false, created_at: timestamp, updated_at: timestamp }; todos = [todo, ...todos]; return { todo: { ...todo } }; },
    async update(id, input) { const fields = validateTodo(input, true); const todo = find(id); Object.assign(todo, fields, { updated_at: new Date().toISOString() }); return { todo: { ...todo } }; },
    async remove(id) { find(id); todos = todos.filter((todo) => todo.id !== id); return null; },
  };
}

const clampPage = (page, total_pages) => Math.min(page, Math.max(1, total_pages));
module.exports = { createDemoService, validateTodo, seedTodos, clampPage };
