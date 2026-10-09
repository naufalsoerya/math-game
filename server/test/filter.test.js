'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../filter');
const CASES = require('./filter-cases');
test('chat filter: every reference case', () => {
  const names = new Set(['Rina', 'Budi', 'Adley'].map(F.nameKey));
  for (const [text, ok] of CASES) assert.equal(F.checkMessage(text, 120, { names }).ok, !!ok, text);
});
test('names: letters, numbers and spaces only, kind, short', () => {
  assert.equal(F.checkName('Adley', 14).ok, true);
  assert.equal(F.nameKey('AdIey'), F.nameKey('Adley'), 'look-alike names share a key');
  assert.equal(F.checkName('Rina B', 14).ok, true);
  for (const bad of ['', '   ', '<b>x</b>', 'stupid', 'a'.repeat(15), 'rina@mail.com', '12345', "Robert'); DROP TABLE players;--"]) assert.equal(F.checkName(bad, 14).ok, false, bad);
});
