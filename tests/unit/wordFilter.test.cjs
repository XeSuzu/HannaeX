const test = require("node:test");
const assert = require("node:assert");
const { normalizeText, checkBannedWords } = require("../../dist/Features/automod/wordFilter.js");

test("normalizeText - remueve acentos, diacríticos y caracteres invisibles", () => {
  const input = "Hólá\u200B múndó\uFEFF con\u00AD tildes";
  const normalized = normalizeText(input);
  assert.strictEqual(normalized, "hola mundo con tildes");
});

test("normalizeText - sustituye leetspeak habitual y símbolos comunes", () => {
  const input = "p4l4br4 c0n l33t y $imb0l0$";
  const normalized = normalizeText(input);
  assert.strictEqual(normalized, "palabra con let y simbolos");
});

test("normalizeText - colapsa repeticiones de caracteres", () => {
  const input = "paaaalaaaabraaaa y hooolaaa";
  const normalized = normalizeText(input);
  assert.strictEqual(normalized, "palabra y hola");
});

test("checkBannedWords - detecta palabras exactas", () => {
  const banned = ["insulto", "estafa"];
  const res = checkBannedWords("Este mensaje es un insulto directo", banned);
  assert.strictEqual(res.hit, true);
  assert.strictEqual(res.word, "insulto");
});

test("checkBannedWords - detecta evasiones por espaciado (p a l a b r a)", () => {
  const banned = ["trampa"];
  const res = checkBannedWords("esto es una t r a m p a para el bot", banned);
  assert.strictEqual(res.hit, true);
  assert.strictEqual(res.word, "trampa");
});

test("checkBannedWords - detecta evasiones con separadores y símbolos (p.a-l_a*b#r!a)", () => {
  const banned = ["trampa"];
  const res = checkBannedWords("mira esta t.r-a_m*p#a que hice", banned);
  assert.strictEqual(res.hit, true);
  assert.strictEqual(res.word, "trampa");
});

test("checkBannedWords - detecta leetspeak y sustituciones numéricas", () => {
  const banned = ["peligro"];
  const res = checkBannedWords("zona de p3l1gr0 inminente", banned);
  assert.strictEqual(res.hit, true);
  assert.strictEqual(res.word, "peligro");
});

test("checkBannedWords - detecta repeticiones exageradas con bypass", () => {
  const banned = ["veneno"];
  const res = checkBannedWords("toma veeeeneeeenoooo puro", banned);
  assert.strictEqual(res.hit, true);
  assert.strictEqual(res.word, "veneno");
});

test("checkBannedWords - evita falsos positivos (Efecto Scunthorpe)", () => {
  const banned = ["puta", "ano", "ban"];
  
  // Palabras legítimas del diccionario que contienen secuencias prohibidas
  assert.strictEqual(checkBannedWords("Estoy usando mi computadora portatil", banned).hit, false);
  assert.strictEqual(checkBannedWords("Me gusta tocar el piano los domingos", banned).hit, false);
  assert.strictEqual(checkBannedWords("El desfile estuvo abanderado por los alumnos", banned).hit, false);
});

test("checkBannedWords - permite mensajes limpios cotidianos", () => {
  const banned = ["malo", "feo"];
  assert.strictEqual(checkBannedWords("Hola a todos, que tengan un lindo dia!", banned).hit, false);
  assert.strictEqual(checkBannedWords("Jugamos una partida en la noche?", banned).hit, false);
});
