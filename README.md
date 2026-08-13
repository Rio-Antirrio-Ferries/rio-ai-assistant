# Rio-Antirrio AI Assistant

## FINAL v1.0.0 — 10 Αυγούστου 2026

Το repository περιέχει την κλειδωμένη έκδοση **Rio-Antirrio AI Assistant v1.0.0** για το Πορθμείο Ρίου-Αντιρρίου.

Η v1.0.0 θεωρείται ενιαίο FINAL σύνολο. Η τεκμηρίωση περιγράφει την τελική κατάσταση του κώδικα και όχι ενδιάμεσες δοκιμές, διορθώσεις ή ιστορικά patches.

## 1. Βασική δομή

Η σειρά φόρτωσης είναι υποχρεωτικά:

1. `rio-ai-assistant.css`
2. `rio-ai-assistant-knowledge.js`
3. `rio-ai-assistant-engine.js`

Το Knowledge πρέπει να έχει φορτωθεί πριν από τον Engine.

## 2. Αρχιτεκτονική

Ο Assistant λειτουργεί τοπικά, χωρίς cloud AI για την κανονική αναγνώριση ερωτήσεων. Υποστηρίζει Ελληνικά και Greeklish και λειτουργεί τόσο στο Blog όσο και στο Rio-Antirrio Live App.

Το `rio-ai-assistant-knowledge.js` περιέχει το Intent Catalogue.  
Το `rio-ai-assistant-engine.js` περιέχει normalization, routing, guards, απαντήσεις, actions και ανάγνωση live/local δεδομένων.  
Το `rio-ai-assistant.css` αφορά αποκλειστικά την εμφάνιση.

## 3. Source of Truth

Σε κάθε μελλοντική εργασία η σειρά εμπιστοσύνης είναι:

1. ο πραγματικός κώδικας που εκτελείται,
2. επιβεβαιωμένη live συμπεριφορά σε Blog και App,
3. το Git history,
4. το παρόν README.

Δεν ανακατασκευάζουμε τον Assistant από μνήμη ή περιγραφή όταν υπάρχουν τα πραγματικά αρχεία.

## 4. Κανόνες προστασίας κεκτημένων

**Απαγορεύεται αλλαγή χωρίς regression test.**

Πριν από οποιαδήποτε επέμβαση:

- διαβάζουμε ολόκληρο το σχετικό Knowledge και το σχετικό routing του Engine,
- εντοπίζουμε το υπάρχον intent πριν δημιουργηθεί νέο,
- κάνουμε τη μικρότερη δυνατή αλλαγή,
- δεν αλλάζουμε priority επειδή μία μόνο φράση απέτυχε,
- δεν χρησιμοποιούμε γενικά keywords όταν μπορούν να κλέψουν άλλη κατηγορία,
- δεν προσθέτουμε handler χωρίς να επιβεβαιωθεί ότι το intent μπορεί πράγματι να φτάσει σε αυτόν,
- δεν αφαιρούμε παλιές phrases/keywords/requiredAny χωρίς πλήρη αιτιολόγηση,
- δεν αλλάζουμε ταυτόχρονα Knowledge, Engine και CSS αν δεν είναι απολύτως αναγκαίο,
- δεν θεωρούμε επιτυχία το syntax check από μόνο του.

## 5. Υποχρεωτικό regression gate

Κάθε αλλαγή πρέπει να περάσει, πριν από deploy:

1. `node --check` σε Knowledge και Engine.
2. Έλεγχο ότι όλες οι παλιές phrases συνεχίζουν να δρομολογούνται όπως πριν, εκτός αν υπάρχει ρητά εγκεκριμένη αλλαγή.
3. Στοχευμένα tests της νέας φράσης.
4. Παραλλαγές κεφαλαίων, στίξης και Greeklish.
5. Live test στο Blog.
6. Live test στο App όταν η λειτουργία αφορά App action ή διαφορετική πηγή δεδομένων.
7. Έλεγχο των γειτονικών intents που μπορούν να συγκρουστούν.

Αν αποτύχει οποιοδήποτε gate, **δεν γίνεται deploy**.

## 6. Collision pairs που ελέγχονται πάντα

- `prices` ↔ `bridgeInfo`
- `specialFareEligibility` ↔ `accessibleBoarding`
- `photos` ↔ `shipsDetails`
- `next` ↔ `distanceGps` ↔ `tripDuration`
- `status` ↔ `assignedVesselUnavailable`
- `vesselPosition` ↔ `departurePoint`
- `payment` ↔ γενικό `pos`
- `history` ↔ `shipsDetails`
- `frequency` ↔ `continuousOperation`
- `contacts` ↔ `companyContacts`
- `install` ↔ `liveApp`
- `petsOnBoard` ↔ `next`

## 7. Ελληνικά / Greeklish

Η υποστήριξη Greeklish είναι κεκτημένο χαρακτηριστικό και δεν αφαιρείται. Νέες παραλλαγές προστίθενται ελεγχόμενα, με σαφές context όταν υπάρχει κίνδυνος collision. Δεν δημιουργούμε ανεξέλεγκτες λίστες ανορθογραφιών.

## 8. Blog και App

Το Blog και το App είναι διαφορετικά περιβάλλοντα και πρέπει να παραμείνουν διαφορετικά όπου απαιτείται.

Blog live πηγές: `mini-id-rio-val`, `mini-id-ant-val`, `mini-id-temp`, `mini-id-wind`, `mini-id-desc`.

App πηγές: `rio-clock`, `ant-clock`, `temp-val`, `wind-val`, `weather-desc`.

Κοινά δεδομένα: `window.ferryGlobalStatus`, `window.ferryAlertMessage`, `window.dRio`, `window.dAnt`.

Δεν αντικαθιστούμε πραγματικά δεδομένα με δεύτερες hardcoded βάσεις.

## 9. Κλειδωμένες σημασιολογικές διακρίσεις

- «ποια/πόσα πλοία δουλεύουν τώρα» → μη διαθέσιμη επιχειρησιακή πληροφορία.
- «ποια/πόσα πλοία έχει η γραμμή» → στοιχεία πλοίων.
- γενικές φωτογραφίες/αρχείο → φωτογραφικό αρχείο.
- φωτογραφίες συγκεκριμένα των πλοίων → στοιχεία πλοίων.
- ΑμεΑ + πρόσβαση/επιβίβαση/ταξίδι → πρόσβαση και εξυπηρέτηση ΑμεΑ.
- ΑμεΑ/πολύτεκνοι + τιμή/έκπτωση/ναύλο → μειωμένο ναύλο.
- «από πού παίρνω το καράβι» → θέση/προβλήτες, όχι επόμενο δρομολόγιο.
- διάρκεια ταξιδιού πλοίου → χρόνος διέλευσης.
- χρόνος για να φτάσω στο καράβι → GPS/ETA.
- «πότε ξεκινούν/σταματούν τα καράβια» → 24ωρη λειτουργία.
- «πόσο συχνά έχει το πρωί/απόγευμα/βράδυ» → συχνότητα βάρδιας.
- τηλέφωνο Λιμενικού → `contacts`.
- τηλέφωνο κοινοπραξίας/εταιρειών → `companyContacts`.

## 10. Τελική κατάσταση v1.0.0

- Knowledge intents: **29**
- Phrase entries: **781**
- Unique phrases: **781**
- Keyword entries: **390**
- Unique keywords: **344**
- requiredAny entries: **253**
- Unique requiredAny: **236**
- Named Engine functions: **134**
- Engine: **4472 γραμμές**
- Knowledge: **1011 γραμμές**

Οι αριθμοί αυτοί είναι baseline ασφαλείας. Μελλοντική μεγάλη πτώση χωρίς σαφή λόγο σταματά το deploy μέχρι να ολοκληρωθεί έλεγχος.

## 11. FINAL release gate

Η v1.0.0 θεωρείται έτοιμη μόνο όταν:

- Knowledge syntax: PASS
- Engine syntax: PASS
- baseline phrase regression: PASS
- targeted routing tests: PASS
- Greeklish/punctuation/case variants: PASS
- Blog live test: PASS
- App live test: PASS
- καμία γνωστή νεκρή κατηγορία: PASS

## Χρυσός κανόνας

> **Δεν ξαναφτιάχνουμε κάτι που ήδη λειτουργεί.  
> Δεν αλλάζουμε δέκα πράγματα για να διορθώσουμε ένα.  
> Δεν κάνουμε deploy επειδή απλώς “δεν βγάζει error”.  
> Προστατεύουμε τα κεκτημένα με regression tests.  
> Κάθε αλλαγή πρέπει να μπορεί να αναιρεθεί μέσω Git.**

**Rio-Antirrio AI Assistant — FINAL v1.0.0 — 10 Αυγούστου 2026**
