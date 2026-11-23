"""Interprétation du texte lu par EasyOCR sur une carte d'identité.

Module volontairement sans dépendance lourde (ni EasyOCR, ni OpenCV) pour pouvoir être testé seul.
"""
import re

# Numéro de CIN : 1 ou 2 lettres suivies de 5 ou 6 chiffres (ex. AB123456)
CIN_PATTERN = re.compile(r"\b[A-Z]{1,2}[0-9]{5,6}\b", re.IGNORECASE)


def _clean_name(raw):
    """« MOHAMED<AMINE<<< » -> « MOHAMED AMINE » : un « < » sépare les prénoms, les suivants ne sont que du remplissage."""
    return " ".join(part for part in raw.split("<") if part.strip()).strip()


def parse_results(results):
    """results : liste [(bbox, texte, confiance), ...] renvoyée par EasyOCR.

    Renvoie toujours {"cin", "nom", "prenom"} (chaînes vides si rien n'est reconnu).
    """
    cin = nom = prenom = ""

    for _, text, _ in results:
        cleaned = text.strip()
        if not cin and CIN_PATTERN.match(cleaned):
            cin = cleaned.upper()

    if results:
        # Dernière ligne MRZ = ligne la plus basse de l'image
        last_line = max(results, key=lambda r: max(point[1] for point in r[0]))
        parts = last_line[1].strip().split("<<", 1)
        if len(parts) == 2:
            nom = _clean_name(parts[0])
            prenom = _clean_name(parts[1])

    return {"cin": cin, "nom": nom, "prenom": prenom}
