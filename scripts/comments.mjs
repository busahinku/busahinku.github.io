// Comments wait for approval. `npm run comments` shows each waiting comment
// with its page and asks what to do with it: a to approve, d to delete, Enter
// to leave it for later. Runs through wrangler, already logged in on this Mac.
import readline from "node:readline/promises";
import { wrangler } from "./r2.mjs";

const sql = (command) =>
  JSON.parse(wrangler(["d1", "execute", "busahin-engagement", "--remote", "--json", "--command", command]))[0].results;

const waiting = sql("SELECT id, key, name, body, created FROM comments WHERE approved = 0 ORDER BY id");
if (!waiting.length) {
  console.log("No comments waiting.");
  process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
for (const [i, c] of waiting.entries()) {
  console.log(`\n${i + 1}/${waiting.length}  ${c.created} UTC  https://busahin.com/${c.key}/`);
  console.log(`${c.name || "(no name)"}:\n${c.body}\n`);
  const answer = (await rl.question("a approve, d delete, Enter later: ")).trim().toLowerCase();
  const id = Number(c.id);
  if (answer === "a") sql(`UPDATE comments SET approved = 1 WHERE id = ${id}`);
  if (answer === "d") sql(`DELETE FROM comments WHERE id = ${id}`);
}
rl.close();
