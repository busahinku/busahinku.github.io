// node workers/engagement/check.mjs: the Worker's input checks.
import assert from "node:assert/strict";
import { KEY, VISITOR, cleanComment } from "./index.js";

for (const key of ["courses/stat497", "projects/portfolio-website", "blog/first-post"]) assert.ok(KEY.test(key), key);
for (const key of ["about", "courses/", "courses/../x", "courses/STAT497", "photos/x", "courses/a/b", `blog/${"a".repeat(90)}`]) assert.ok(!KEY.test(key), key);

assert.ok(VISITOR.test(crypto.randomUUID()));
assert.ok(!VISITOR.test("x"));

assert.deepEqual(cleanComment({ name: "  Ayşe \n K ", body: "  Great notes.\r\n\r\n\r\n\r\nThanks!  " }), { name: "Ayşe K", body: "Great notes.\n\nThanks!" });
assert.deepEqual(cleanComment({ body: "ok" }), { name: "", body: "ok" });
assert.equal(cleanComment({ body: " a " }), null);
assert.equal(cleanComment({ body: "x".repeat(2001) }), null);
assert.equal(cleanComment({ body: 42 }), null);
assert.deepEqual(cleanComment({ name: "x\u001b[2J", body: "hi\u001b]0;pwned\u0007 there" }), { name: "x[2J", body: "hi]0;pwned there" });
assert.equal(cleanComment({ name: "x".repeat(100), body: "hello" }).name.length, 60);

console.log("engagement checks pass");
