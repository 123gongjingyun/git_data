const test = require("node:test");
const assert = require("node:assert/strict");
const {
  hashPassword,
  verifyPassword,
} = require("../dist/auth/password.utils.js");

test("hashPassword and verifyPassword work together", async () => {
  const hashed = await hashPassword("Presales@123");
  assert.ok(typeof hashed === "string");
  assert.notEqual(hashed, "Presales@123");

  const matched = await verifyPassword("Presales@123", hashed);
  const mismatched = await verifyPassword("WrongPassword", hashed);

  assert.equal(matched, true);
  assert.equal(mismatched, false);
});
