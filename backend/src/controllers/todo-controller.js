const { createTodoSchema, listQuerySchema, todoIdSchema, updateTodoSchema } = require('../validation/todos');
const { parseOrThrow } = require('../validation/parse');
const { createTodo, deleteTodo, getTodo, getTodoStats, listTodos, updateTodo } = require('../services/todo-service');

async function list(request, response) {
  const query = parseOrThrow(listQuerySchema, request.query ?? {});
  const result = await listTodos(request.user.id, query);
  response.status(200).json(result);
}

async function create(request, response) {
  const body = parseOrThrow(createTodoSchema, request.body ?? {});
  const todo = await createTodo(request.user.id, body);
  response.status(201).json({ todo });
}

async function stats(request, response) {
  const statsResult = await getTodoStats(request.user.id);
  response.status(200).json({ stats: statsResult });
}

async function readOne(request, response) {
  const { id } = parseOrThrow(todoIdSchema, request.params ?? {});
  const todo = await getTodo(request.user.id, id);
  response.status(200).json({ todo });
}

async function update(request, response) {
  const { id } = parseOrThrow(todoIdSchema, request.params ?? {});
  const body = parseOrThrow(updateTodoSchema, request.body ?? {});
  const todo = await updateTodo(request.user.id, id, body);
  response.status(200).json({ todo });
}

async function remove(request, response) {
  const { id } = parseOrThrow(todoIdSchema, request.params ?? {});
  await deleteTodo(request.user.id, id);
  response.status(204).end();
}

module.exports = {
  create,
  list,
  readOne,
  remove,
  stats,
  update,
};