export function buildUserQuery(id: string) {
  return `SELECT * FROM accounts WHERE id = '${id}'`
}
