"""Tests du parseur de carte d'identité : `python -m unittest discover -s tests` depuis mon_projet_mrz/."""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from ocr_parser import CIN_PATTERN, parse_results  # noqa: E402


def line(text, y, conf=0.9):
    """Un résultat EasyOCR : une boîte dont le bas est à l'ordonnée y."""
    return ([[0, y - 10], [100, y - 10], [100, y], [0, y]], text, conf)


class ParseResultsTest(unittest.TestCase):
    def test_cin_nom_prenom(self):
        r = parse_results([line("AB123456", 50), line("DAMIRI<<OUMAIMA<<<<<<<<", 300)])
        self.assertEqual(r, {"cin": "AB123456", "nom": "DAMIRI", "prenom": "OUMAIMA"})

    def test_cin_en_minuscules_est_normalise(self):
        self.assertEqual(parse_results([line("m667422", 40)])["cin"], "M667422")

    def test_cin_a_six_chiffres_et_une_lettre(self):
        self.assertEqual(parse_results([line("M667422", 40)])["cin"], "M667422")

    def test_premier_cin_valide_gagne(self):
        r = parse_results([line("XY999999", 20), line("AB123456", 30), line("A<<B", 400)])
        self.assertEqual(r["cin"], "XY999999")

    def test_prenoms_composes_gardent_leur_espace(self):
        # « < » seul = séparateur de prénoms, « << » = séparation nom / prénom
        r = parse_results([line("BENALI<<MOHAMED<AMINE<<<<<", 300)])
        self.assertEqual((r["nom"], r["prenom"]), ("BENALI", "MOHAMED AMINE"))

    def test_nom_compose(self):
        r = parse_results([line("EL<FASSI<<SARA<<<<", 300)])
        self.assertEqual((r["nom"], r["prenom"]), ("EL FASSI", "SARA"))

    def test_la_derniere_ligne_est_la_plus_basse_pas_la_derniere_de_la_liste(self):
        # EasyOCR ne renvoie pas forcément les lignes dans l'ordre : on choisit par position verticale
        r = parse_results([line("DAMIRI<<OUMAIMA<<<", 500), line("AB123456", 100), line("BLABLA<<XYZ", 200)])
        self.assertEqual((r["nom"], r["prenom"]), ("DAMIRI", "OUMAIMA"))

    def test_sans_separateur_nom_prenom_restent_vides(self):
        r = parse_results([line("AB123456", 50), line("TEXTE SANS MRZ", 300)])
        self.assertEqual((r["cin"], r["nom"], r["prenom"]), ("AB123456", "", ""))

    def test_aucun_resultat(self):
        self.assertEqual(parse_results([]), {"cin": "", "nom": "", "prenom": ""})

    def test_texte_qui_ressemble_a_un_cin_mais_non(self):
        for text in ("ABC123456", "A1234", "A1234567", "123456", "AB 123456"):
            self.assertIsNone(CIN_PATTERN.fullmatch(text), text)
        self.assertEqual(parse_results([line("ABC123456", 10)])["cin"], "")

    def test_reponse_toujours_les_trois_cles(self):
        self.assertEqual(set(parse_results([line("x", 1)])), {"cin", "nom", "prenom"})


if __name__ == "__main__":
    unittest.main()
