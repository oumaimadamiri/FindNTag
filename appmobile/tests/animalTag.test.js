// Tests du module NFC (src/nfc/animalTag.js) avec le lanceur intégré à Node : `npm test`
// La puce NFC est simulée : on teste NOTRE logique (format du tag, lecture, garde-fous), pas le matériel.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const babel = require("@babel/core");

const ID = "123e4567-e89b-12d3-a456-426614174000";
const toBytes = (s) => Array.from(Buffer.from(s, "utf8"));
const tag = (obj) => ({
  id: "04AABBCC",
  ndefMessage: [{ payload: toBytes(typeof obj === "string" ? obj : JSON.stringify(obj)) }],
});

/** Charge animalTag.js avec un faux react-native-nfc-manager. */
function load() {
  const file = path.join(__dirname, "..", "src", "nfc", "animalTag.js");
  const code = babel.transformFileSync(file, {
    presets: ["babel-preset-expo"],
    plugins: [],
    babelrc: false,
    configFile: false,
  }).code;

  const state = { lastWritten: null, tagUid: "04AABBCC" };
  const fake = {
    __esModule: true,
    default: {
      start: async () => {},
      requestTechnology: async () => {},
      cancelTechnologyRequest: async () => {},
      isSupported: async () => true,
      getTag: async () => ({ id: state.tagUid }),
      ndefHandler: {
        writeNdefMessage: async (bytes) => {
          state.lastWritten = bytes;
        },
      },
    },
    NfcTech: { Ndef: "Ndef" },
    Ndef: {
      text: { decodePayload: (p) => Buffer.from(p).toString("utf8") },
      textRecord: (t) => ({ t }),
      encodeMessage: (records) => toBytes(records[0].t),
    },
  };
  const mod = { exports: {} };
  new Function("require", "exports", "module", code)(
    (id) => (id === "react-native-nfc-manager" ? fake : require(id)),
    mod.exports,
    mod,
  );
  return { T: mod.exports, state };
}

test("lecture d'un tag v2 : identifiant, nom, téléphone", () => {
  const { T } = load();
  const r = T.parseTag(tag({ v: 2, id: ID, n: "Rex", pt: "0600000001" }));
  assert.deepEqual(r, { kind: "v2", publicId: ID, nom: "Rex", telephone: "0600000001" });
});

test("l'identifiant est normalisé en minuscules", () => {
  const { T } = load();
  assert.equal(T.parseTag(tag({ v: 2, id: ID.toUpperCase(), n: "Rex" })).publicId, ID);
});

test("contenus invalides ou vides : jamais d'exception, toujours { kind: 'empty' }", () => {
  const { T } = load();
  const empties = [
    tag({ v: 2, id: "../../etc/passwd", n: "x" }), // identifiant non conforme
    tag({ v: 2, n: "x" }), // sans identifiant
    tag({ v: 2 }), // tag effacé
    tag("Tag vide"), // ancien « effacement » : texte non JSON
    tag("42"), // JSON qui n'est pas un objet
    { id: "x" }, // aucun message NDEF
    null,
    undefined,
  ];
  for (const t of empties) assert.equal(T.parseTag(t).kind, "empty", JSON.stringify(t)?.slice(0, 60));
});

test("ancien format reconnu (legacy) avec ses données", () => {
  const { T } = load();
  const r = T.parseTag(
    tag({ n: "Rex", r: "Berger", a: 3, t: "04AABB", pn: "Dupont", pp: "Alice", pc: "AB123456", pt: "0600000001", pe: "a@x.com" }),
  );
  assert.equal(r.kind, "legacy");
  assert.equal(r.race, "Berger");
  assert.equal(r.tagUid, "04AABB");
  assert.equal(r.prenomProprio, "Alice");
  assert.equal(r.cinProprio, "AB123456");
});

test("le payload écrit ne contient ni CIN, ni email, ni photo", () => {
  const { T } = load();
  const p = T.buildTagPayload({ publicId: ID, nom: "  Rex  ", telephone: "0600000001" });
  assert.deepEqual(Object.keys(p), ["v", "id", "n", "pt"]);
  assert.equal(p.v, 2);
  assert.equal(p.n, "Rex");
});

test("nom et téléphone sont tronqués (40 / 20 caractères)", () => {
  const { T } = load();
  const p = T.buildTagPayload({ publicId: ID, nom: "N".repeat(500), telephone: "9".repeat(500) });
  assert.equal(p.n.length, 40);
  assert.equal(p.pt.length, 20);
});

test("refuse d'écrire un tag pour un animal sans identifiant public", () => {
  const { T } = load();
  assert.throws(() => T.buildTagPayload({ nom: "x" }), /Identifiant/);
});

test("écriture : renvoie l'UID du tag, taille < 100 octets (tient sur un NTAG213)", async () => {
  const { T, state } = load();
  const uid = await T.writeAnimalTag({ publicId: ID, nom: "Rex", telephone: "0600000001" });
  assert.equal(uid, "04AABBCC");
  assert.equal(JSON.parse(Buffer.from(state.lastWritten).toString()).id, ID);
  assert.ok(state.lastWritten.length < 100, `taille ${state.lastWritten.length}`);
});

test("effacement : le tag relu est vide", async () => {
  const { T, state } = load();
  await T.eraseTag();
  assert.equal(T.parseTag(tag(Buffer.from(state.lastWritten).toString())).kind, "empty");
});

test("deux opérations NFC simultanées : la seconde est refusée proprement", async () => {
  const { T } = load();
  const first = T.readAnimalTag();
  await assert.rejects(T.readAnimalTag(), /déjà en cours/);
  await first;
  // la session est libérée : une nouvelle lecture est possible
  assert.equal(typeof (await T.readAnimalTag()).kind, "string");
});
