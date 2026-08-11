Rio–Antirrio AI Assistant
Τεχνικό Εγχειρίδιο – Οδηγός Συντήρησης & Παράδοσης
Το repository περιέχει τα εξωτερικά αρχεία του Rio–Antirrio AI Assistant, του τοπικού βοηθού για τη γραμμή πορθμείων Ρίου–Αντιρρίου.
Το `README.md` είναι το βασικό τεχνικό εγχειρίδιο του project. Στόχος είναι ο δημιουργός, ένας μελλοντικός προγραμματιστής ή μια νέα AI συνομιλία να μπορεί να καταλάβει τι λειτουργεί, ποιο αρχείο είναι υπεύθυνο για κάθε λειτουργία και πώς γίνονται ασφαλείς αλλαγές χωρίς να χαλάει η ήδη ελεγμένη συμπεριφορά.
---
🔒 Έκδοση 1.0.0 — Ενεργό εξωτερικό build
Η έκδοση παραμένει 1.0.0. Οι διορθώσεις και ο εμπλουτισμός της 11ης Αυγούστου 2026 θεωρούνται βελτιώσεις της ίδιας έκδοσης και δεν αλλάζουν version number.
Το ιστορικό FINAL MASTER της 10ης Αυγούστου 2026 παραμένει ασφαλές σημείο αναφοράς. Η ενεργή εξέλιξη γίνεται πλέον στα εξωτερικά αρχεία του GitHub.
Πραγματικός έλεγχος 11 Αυγούστου 2026
Ελέγχθηκαν τα πραγματικά αρχεία που προορίζονται για GitHub:
Αρχείο	Γραμμές	Μέγεθος	SHA-256
`rio-ai-assistant-engine.js`	4250	238,795 bytes	`9a28b798000f99d27dbed1911ed571bd6ea96b05f9caf3e92b90ebf4b5462cda`
`rio-ai-assistant-knowledge.js`	837	39,666 bytes	`e3299412761dfa8457db9a4ee08864c9865e4d09ad1622a4a6de958f4280f911`
Ο Engine πέρασε JavaScript syntax check (`node --check`) χωρίς σφάλμα. Το Knowledge πέρασε επίσης syntax check και φορτώθηκε δοκιμαστικά ώστε να μετρηθεί το πραγματικό catalogue.
> Σημείωση: το Engine που ελέγχθηκε έχει Windows CRLF line endings. Αυτό εξηγεί γιατί το byte-level SHA-256 μπορεί να διαφέρει από αντίγραφο με ίδιο JavaScript αλλά LF line endings. Η λειτουργική σύγκριση του κώδικα είχε επιβεβαιώσει ότι πρόκειται για το ίδιο FINAL Engine.
---
1. Αρχιτεκτονική
Η ενεργή αρχιτεκτονική είναι:
```text
Blogger
  ↓
HTML Shell / Loader
  ↓
GitHub Pages
  ├── rio-ai-assistant.css
  ├── rio-ai-assistant-knowledge.js
  └── rio-ai-assistant-engine.js
```
Υποχρεωτική σειρά:
```text
CSS → Knowledge → Engine
```
Το Knowledge πρέπει να φορτώνεται πριν από τον Engine.
---
2. Βασική φιλοσοφία
Ο Assistant είναι local-first / local-only ως προς την AI κατανόηση. Δεν χρησιμοποιεί Gemini, ChatGPT ή Cloudflare AI για την κανονική αναγνώριση ερωτήσεων.
Η λειτουργία βασίζεται σε:
Ελληνικά και Greeklish,
normalization,
phrases / keywords / requiredAny,
priorities και ειδικούς routing κανόνες,
parsers για ημέρα, ώρα και λιμάνι,
live DOM δεδομένα από Blog/App,
τοπικές actions για GPS, θέση πλοίων και πλοήγηση.
Δεν βάζουμε hardcoded live κατάσταση, live καιρό ή live ώρες όταν υπάρχουν ήδη πραγματικές πηγές δεδομένων.
---
3. Αρχεία και ownership
`rio-ai-assistant.css`
Υπεύθυνο αποκλειστικά για εμφάνιση: χρώματα, spacing, responsive, cards, chat, typography και visual states.
`rio-ai-assistant-knowledge.js`
Είναι το Intent Catalogue. Το ελεγμένο build της 11/08/2026 έχει:
27 intents
472 phrase entries — 472 μοναδικές
359 keyword entries — 317 μοναδικά
233 requiredAny entries — 220 μοναδικά
837 γραμμές
Εκθέτει:
```javascript
window.RioAIKnowledge.intents
```
`rio-ai-assistant-engine.js`
Είναι η λειτουργική μηχανή. Το ελεγμένο build της 11/08/2026 έχει:
4250 γραμμές
132 named functions
267 `const` / 33 `let`
σύνδεση με το εξωτερικό Knowledge,
ειδικό routing πριν από το γενικό intent scoring,
response logic και actions Blog/App.
---
4. Τα 27 ενεργά intents
#	Intent	Priority	Phrases	Keywords	requiredAny
1	`next3`	100	8	9	5
2	`schedule`	90	10	13	10
3	`distanceGps`	96	24	19	11
4	`vesselPosition`	94	41	16	12
5	`gps`	85	4	4	4
6	`next`	80	29	25	16
7	`status`	75	27	23	18
8	`prices`	70	13	22	14
9	`forecast`	69	11	11	9
10	`weather`	68	12	14	13
11	`passengerFare`	72	20	14	8
12	`payment`	67	20	13	12
13	`navigation`	66	18	12	8
14	`emergency`	95	10	9	4
15	`install`	64	14	12	5
16	`frequency`	82	30	18	8
17	`continuousOperation`	83	14	12	8
18	`assistantAbout`	63	20	17	17
19	`assignedVesselUnavailable`	97	44	24	6
20	`shipsDetails`	62	13	10	8
21	`departurePoint`	93	12	6	2
22	`bridgeInfo`	118	14	5	5
23	`specialFareEligibility`	119	12	7	7
24	`petsOnBoard`	117	26	20	10
25	`history`	50	9	7	3
26	`info`	45	7	7	4
27	`capabilities`	60	10	10	6
---
5. Σημαντικές κλειδωμένες συμπεριφορές
Οι παρακάτω συμπεριφορές έχουν πλέον σαφή ownership και δεν πρέπει να ξανασυγχωνευθούν πρόχειρα με γενικές κατηγορίες:
`frequency`: συχνότητα και daypart ερωτήσεις, π.χ. «κάθε πότε περνάει καράβι», «πρωινά δρομολόγια», «απογευματινά δρομολόγια», «βραδινά δρομολόγια».
`continuousOperation`: 24ωρη λειτουργία / πότε σταματούν ή ξεκινούν γενικά τα δρομολόγια.
`departurePoint`: «από ποια προβλήτα φεύγει το καράβι;» και αντίστοιχες Greeklish διατυπώσεις. Οδηγεί στη λογική θέσης/προβλήτας, όχι στο επόμενο δρομολόγιο.
`assignedVesselUnavailable`: «πόσα/ποια καράβια δουλεύουν τώρα;». Η απάντηση αφορά εσωτερική επιχειρησιακή πληροφορία που δεν είναι διαθέσιμη ως αξιόπιστο live δεδομένο.
`distanceGps`: ερωτήσεις όπως «πόσο θέλω για την προβλήτα» ανήκουν σε GPS/ETA και όχι σε τιμές.
`prices`, `passengerFare`, `payment`, `specialFareEligibility`: ξεχωριστές οικονομικές/ναυλολογικές έννοιες ώστε ερωτήσεις όπως «πόσα πληρώνει το μηχανάκι;» να μη χάνονται στο fallback.
`bridgeInfo`: πληροφορίες που αφορούν τη γέφυρα/διόδια και όχι το πορθμείο.
`petsOnBoard`: κατοικίδια και σχετικές κατηγορίες μεταφοράς.
`emergency`: επείγουσα επικοινωνία.
`vesselPosition`: θέση πλοίων, ανατολικά/δυτικά και σχετική λειτουργική κατεύθυνση.
---
6. Δρομολόγια και συχνότητα
Δεν απαντάμε σε κάθε ερώτηση που περιέχει «δρομολόγια» με ολόκληρο το πρόγραμμα.
Ο Engine ξεχωρίζει:
επόμενο δρομολόγιο,
επόμενα 3,
πλήρες πρόγραμμα,
συχνότητα,
πρωινά / απογευματινά / βραδινά,
24ωρη λειτουργία,
σήμερα / αύριο,
μετά από συγκεκριμένη ώρα,
λιμάνι Ρίο / Αντίρριο.
Οι ώρες πρέπει να εμφανίζονται με σωστό spacing και να προέρχονται από τα διαθέσιμα schedule data.
---
7. Blog και App
Ο Engine διατηρεί διαφορετικές πηγές δεδομένων ανά περιβάλλον.
Blog
Ενδεικτικά live DOM IDs:
`mini-id-rio-val`
`mini-id-ant-val`
`mini-id-temp`
`mini-id-wind`
`mini-id-desc`
App
Ενδεικτικά:
`rio-clock`
`ant-clock`
`temp-val`
`wind-val`
`weather-desc`
Κοινά δεδομένα:
`window.ferryGlobalStatus`
`window.ferryAlertMessage`
`window.dRio`
`window.dAnt`
Δεν δημιουργούμε δεύτερη hardcoded βάση για δεδομένα που υπάρχουν ήδη live.
---
8. OPEN / CLOSE και actions
Η κατάσταση της γραμμής πρέπει να βασίζεται στα πραγματικά διαθέσιμα δεδομένα.
Σε CLOSED mode δεν πρέπει να παρουσιάζονται actions σαν να είναι διαθέσιμη η κανονική λειτουργία. Όπου υπάρχει, χρησιμοποιείται το `window.ferryAlertMessage`.
GPS / ETA εμφανίζονται μόνο όταν υπάρχουν πραγματικά δεδομένα θέσης. Δεν επινοούνται χρόνοι ή αποστάσεις.
---
9. Ελληνικά και Greeklish
Η Greeklish υποστήριξη είναι μόνιμο χαρακτηριστικό της v1.0.0.
Νέα διατύπωση προστίθεται πρώτα στο σωστό υπάρχον intent. Δεν δημιουργούμε νέο intent μόνο επειδή αλλάζει η ορθογραφία ή η γραφή.
Πριν από κάθε προσθήκη:
έλεγχος για υπάρχουσα ίδια/παρόμοια φράση,
σωστό intent,
αποφυγή duplicates,
ελληνική μορφή,
χρήσιμη Greeklish μορφή,
έλεγχος keywords / requiredAny,
regression test σε σχετικές παλιές ερωτήσεις.
---
10. Κανόνας μικρότερης δυνατής αλλαγής
Νέα διατύπωση → συνήθως Knowledge.
Αλλαγή απάντησης ή action → συνήθως Engine.
Αλλαγή εμφάνισης → CSS.
Νέα πραγματική λειτουργία → εξετάζουμε Engine + πιθανό Knowledge.
Δεν ξαναγράφουμε ολόκληρο το σύστημα για μία μικρή διόρθωση.
---
11. Git και deployment
Κάθε αλλαγή πρέπει να έχει σαφές commit message και να μπορεί να γίνει rollback.
Παραδείγματα:
```text
Add Greeklish phrase for departure point
Fix frequency routing for daypart schedules
Update motorcycle fare recognition
Refine vessel availability response
Finalize Engine and Knowledge updates v1.0.0
```
Πριν από live deploy:
syntax check,
Knowledge load check,
intent/regression tests,
Blog test,
App test,
έλεγχος OPEN/CLOSE,
έλεγχος GPS/actions,
commit.
---
12. Ιστορικό baseline FINAL MASTER — 10/08/2026
Το αρχικό FINAL MASTER παραμένει ιστορικό σημείο αναφοράς. Οι αρχικές μετρήσεις του ήταν:
25 intents
533 phrase entries
269 keyword entries
207 requiredAny entries
129 named engine functions
εξωτερικός Engine: 4216 γραμμές
εξωτερικό Knowledge: 611 γραμμές
CSS baseline: 747 γραμμές
Αυτοί οι αριθμοί δεν είναι πλέον οι τρέχοντες αριθμοί του ενεργού Knowledge/Engine. Διατηρούνται μόνο για σύγκριση και rollback.
---
13. Source of Truth
Σε περίπτωση αμφιβολίας:
τρέχων ελεγμένος κώδικας στο GitHub,
γνωστή live λειτουργική συμπεριφορά,
Git commit history,
FINAL MASTER 10/08/2026 ως rollback reference,
README.
Αν το documentation διαφωνεί με τον πραγματικό κώδικα, ελέγχουμε πρώτα τι πραγματικά εκτελείται.
---
14. Οδηγία για νέα AI συνομιλία / προγραμματιστή
Πριν γίνει αλλαγή:
διάβασε ολόκληρο το README,
διάβασε το πραγματικό `rio-ai-assistant-knowledge.js`,
διάβασε το σχετικό σημείο του `rio-ai-assistant-engine.js`,
έλεγξε το Git history,
κάνε τη μικρότερη ασφαλή αλλαγή,
διατήρησε Blog/App και Ελληνικά/Greeklish,
κάνε πραγματικό test πριν από deploy.
---
Χρυσός κανόνας
> \*\*Δεν ξαναφτιάχνουμε κάτι που ήδη λειτουργεί.  
> Δεν αλλάζουμε δέκα πράγματα για να διορθώσουμε ένα.  
> Κρατάμε ασφαλές rollback.  
> Κάνουμε μικρές ελεγχόμενες αλλαγές.  
> Δοκιμάζουμε πριν από το deploy.  
> Και χρησιμοποιούμε το Git ώστε κάθε αλλαγή να μπορεί να ανακτηθεί ή να αναιρεθεί.\*\*
Rio–Antirrio AI Assistant — v1.0.0  
Current verified external build: 11 Αυγούστου 2026
