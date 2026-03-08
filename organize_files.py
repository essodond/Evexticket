import os, shutil
src = 'C:/Users/DELL/Documents/projet/Evexticket'
dst = os.path.join(src, 'documents')
os.makedirs(dst, exist_ok=True)
files = [
    '1_cahier_des_charges.md',
    '2_proposition_commerciale_compagnies.md',
    '3_convention_partenariat.md',
    '4_conditions_generales_utilisation.md',
    '5_guide_onboarding_compagnies.md',
    '6_plan_affaires.md',
]
for f in files:
    src_path = os.path.join(src, f)
    dst_path = os.path.join(dst, f)
    if os.path.exists(src_path):
        shutil.copy2(src_path, dst_path)
        # Clear original with redirect note
        with open(src_path, 'w', encoding='utf-8') as fh:
            fh.write('<!-- Moved to documents/ -->\n')
        print(f'Moved: {f}')
    else:
        print(f'NOT FOUND: {f}')

# Create the index file
index_content = '''# 📁 EVEXTICKET — Dossier Documentaire Officiel

**Plateforme de réservation de billets de bus au Togo**

---

Ce dossier contient l\'ensemble des documents officiels nécessaires au lancement commercial et juridique d\'Evexticket (TogoTrans).

## 📄 Liste des Documents

| # | Fichier | Type | Destinataires | Usage |
|---|---------|------|---------------|-------|
| 1 | `1_cahier_des_charges.md` | Technique | Équipe technique, investisseurs | Référence technique et fonctionnelle complète |
| 2 | `2_proposition_commerciale_compagnies.md` | Commercial | Compagnies de bus | Envoi aux compagnies pour les convaincre de rejoindre la plateforme |
| 3 | `3_convention_partenariat.md` | Juridique | Compagnies partenaires | Contrat à signer pour officialiser le partenariat |
| 4 | `4_conditions_generales_utilisation.md` | Juridique | Grand public | CGU à publier sur le site web |
| 5 | `5_guide_onboarding_compagnies.md` | Opérationnel | Compagnies partenaires | Guide pratique pour utiliser la plateforme |
| 6 | `6_plan_affaires.md` | Stratégique | Investisseurs, banques, partenaires | Business plan pour levée de fonds ou financement |

---

## 🎯 Ordre d\'Utilisation Recommandé

### Phase 1 : Prospection des compagnies
1. Envoyer le document **`2_proposition_commerciale_compagnies.md`** (personnalisé par compagnie) comme email ou courrier
2. Organiser un rendez-vous de présentation

### Phase 2 : Signature du partenariat
3. Faire signer la **`3_convention_partenariat.md`** (compléter les champs entre crochets)

### Phase 3 : Onboarding technique
4. Remettre le **`5_guide_onboarding_compagnies.md`** à l\'équipe technique de la compagnie

### Phase 4 : Communication aux voyageurs
5. Publier les **`4_conditions_generales_utilisation.md`** sur le site

### Phase 5 : Recherche de financements
6. Présenter le **`6_plan_affaires.md`** aux investisseurs et banques

---

## ✏️ Note sur la Personnalisation

Les documents **2** et **3** contiennent des champs à compléter indiqués entre crochets `[COMME CECI]`. Pensez à les remplir avant envoi :
- `[NOM DE LA COMPAGNIE]`
- `[NOM DU RESPONSABLE]`
- `[DATE]`
- `[MONTANT DE LA COMMISSION]`
- `[VILLE]`

---

## 📞 Contact Evexticket

| Rôle | Contact |
|------|---------|
| Direction Générale | direction@evexticket.com |
| Commercial | commercial@evexticket.com |
| Support Technique | support@evexticket.com |
| Site web | www.evexticket.com |

---

*Evexticket SARL — Révolutionnons le transport au Togo 🇹🇬*
'''

index_path = os.path.join(dst, '0_INDEX.md')
with open(index_path, 'w', encoding='utf-8') as fh:
    fh.write(index_content)
print('Created: 0_INDEX.md')
print('Done!')
