// Comments wait for approval.
//   npm run comments                  each waiting comment in turn: a approve, d delete, Enter later
//   npm run comments -- list          the waiting ones as JSON (Kalem reads this)
//   npm run comments -- approve <id>
//   npm run comments -- delete <id>
// Runs through wrangler, already logged in on this Mac.
import readline from "node:readline/promises";
import { wrangler } from "./r2.mjs";

const sql = (command) =>
  JSON.parse(wrangler(["d1", "execute", "busahin-engagement", "--remote", "--json", "--command", command]))[0].results;
const waiting = () => sql("SELECT id, key, name, body, created FROM comments WHERE approved = 0 ORDER BY id");
const act = (verb, id) => {
  if (!Number.isInteger(id) || id < 1) throw new Error(`Not a comment id: ${id}`);
  sql(verb === "approve" ? `UPDATE comments SET approved = 1 WHERE id = ${id}` : `DELETE FROM comments WHERE id = ${id}`);
};

const [command, id] = process.argv.slice(2);
if (command === "list") {
  console.log(JSON.stringify(waiting()));
} else if (command === "approve" || command === "delete") {
  act(command, Number(id));
} else {
  const list = waiting();
  if (!list.length) {
    console.log("No comments waiting.");
    process.exit(0);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  for (const [i, c] of list.entries()) {
    console.log(`\n${i + 1}/${list.length}  ${c.created} UTC  https://busahin.com/${c.key}/`);
    console.log(`${c.name || "(no name)"}:\n${c.body}\n`);
    const answer = (await rl.question("a approve, d delete, Enter later: ")).trim().toLowerCase();
    if (answer === "a") act("approve", c.id);
    if (answer === "d") act("delete", c.id);
  }
  rl.close();
}
