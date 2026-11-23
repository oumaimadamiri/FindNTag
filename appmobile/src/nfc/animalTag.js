import NfcManager, { NfcTech, Ndef } from "react-native-nfc-manager";

/**
 * Format du tag (v2) : un enregistrement texte contenant uniquement
 *   {"v":2,"id":"<identifiant public>","n":"<nom de l'animal>","pt":"<téléphone du propriétaire>"}
 * Pas de CIN, pas d'email, pas de photo : tout le reste est récupéré via l'API.
 * Le nom et le téléphone permettent de contacter le propriétaire même sans réseau.
 */
export const TAG_VERSION = 2;

const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let busy = false;

/** Session NFC exclusive : attend un tag, exécute `action`, libère TOUJOURS le tag ensuite. */
async function withTag(action) {
  if (busy) throw new Error("Une opération NFC est déjà en cours");
  busy = true;
  try {
    await NfcManager.start().catch(() => {});
    await NfcManager.requestTechnology(NfcTech.Ndef);
    return await action();
  } finally {
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch {
      // rien à libérer
    }
    busy = false;
  }
}

/** À appeler au démontage d'un écran qui lit un tag. */
export async function cancelNfc() {
  try {
    await NfcManager.cancelTechnologyRequest();
  } catch {
    // rien à annuler
  }
}

export async function isNfcSupported() {
  try {
    const supported = await NfcManager.isSupported();
    if (supported) await NfcManager.start();
    return supported;
  } catch {
    return false;
  }
}

const clip = (value, max) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

export function buildTagPayload({ publicId, nom, telephone }) {
  if (!publicId) throw new Error("Identifiant de l'animal manquant");
  return {
    v: TAG_VERSION,
    id: publicId,
    n: clip(nom, 40),
    pt: clip(telephone, 20),
  };
}

/**
 * Interprète le contenu d'un tag. Renvoie toujours l'un de ces objets :
 *  - { kind: "empty" }
 *  - { kind: "v2", publicId, nom, telephone }
 *  - { kind: "legacy", nom, race, age, tagUid, prenomProprio, nomProprio, cinProprio, emailProprio, telephone, type }
 *    (anciens tags : les données personnelles sont sur le tag ; à reprogrammer)
 */
export function parseTag(tag) {
  const record = tag?.ndefMessage?.[0];
  if (!record) return { kind: "empty" };

  let data;
  try {
    data = JSON.parse(Ndef.text.decodePayload(record.payload));
  } catch {
    return { kind: "empty" };
  }
  if (!data || typeof data !== "object") return { kind: "empty" };

  if (data.v === TAG_VERSION) {
    if (typeof data.id !== "string" || !UUID_FORMAT.test(data.id)) {
      return { kind: "empty" };
    }
    return {
      kind: "v2",
      publicId: data.id.toLowerCase(),
      nom: data.n || "",
      telephone: data.pt || "",
    };
  }

  if (!data.n && !data.pt) return { kind: "empty" };
  return {
    kind: "legacy",
    nom: data.n || "",
    race: data.r || "",
    age: data.a ?? "",
    tagUid: data.t || tag?.id || null,
    prenomProprio: data.pp || "",
    nomProprio: data.pn || "",
    cinProprio: data.pc || "",
    emailProprio: data.pe || "",
    telephone: data.pt || "",
    type: data.ty || "animal",
  };
}

export async function readAnimalTag() {
  return withTag(async () => parseTag(await NfcManager.getTag()));
}

/** Écrit le tag au format v2. Renvoie l'UID matériel du tag (ou null). */
export async function writeAnimalTag(data) {
  const json = JSON.stringify(buildTagPayload(data));
  const bytes = Ndef.encodeMessage([Ndef.textRecord(json)]);
  if (!bytes) throw new Error("Encodage NDEF impossible");
  return withTag(async () => {
    const tag = await NfcManager.getTag();
    await NfcManager.ndefHandler.writeNdefMessage(bytes);
    return tag?.id ?? null;
  });
}

/** Efface le tag : il contient ensuite un enregistrement valide mais sans animal. */
export async function eraseTag() {
  const bytes = Ndef.encodeMessage([
    Ndef.textRecord(JSON.stringify({ v: TAG_VERSION })),
  ]);
  if (!bytes) throw new Error("Encodage NDEF impossible");
  return withTag(async () => {
    await NfcManager.ndefHandler.writeNdefMessage(bytes);
  });
}
