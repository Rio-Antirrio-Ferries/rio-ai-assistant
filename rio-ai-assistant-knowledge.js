/*
 * Rio-Antirrio AI Assistant — Knowledge Catalogue
 * Extracted from v1.0.0 FINAL MASTER.
 * FINAL MASTER remains unchanged.
 */
(function (global) {
    'use strict';

    const INTENTS = {
        /* 01. next3 */
        next3: {
            priority: 100,
            phrases: [
                'επομενα 3', 'τρια επομενα', 'επομενη ωρα', 'επομενα δρομολογια',
                'epomena 3', 'tria epomena', 'epomeni ora', 'epomena dromologia'
            ],
            keywords: [
                'επομενα', 'τρια', '3', 'ωρα', 'δρομολογια',
                'epomena', 'tria', 'ora', 'dromologia'
            ],
            requiredAny: ['επομενα', 'τρια', '3', 'epomena', 'tria']
        },
        /* 02. schedule */
        schedule: {
            priority: 90,
            phrases: [
                'πληρεσ προγραμμα', 'ολα τα δρομολογια', 'προγραμμα δρομολογιων',
                'ωρεσ δρομολογιων', 'ωραρια δρομολογιων',
                'ores dromologion', 'oraria dromologion',
                'plires programma', 'ola ta dromologia', 'programma dromologion'
            ],
            keywords: [
                'προγραμμα', 'δρομολογια', 'δρομολογιων', 'ωρεσ', 'ωραρια', 'ολα', '24ωρο',
                'programma', 'dromologia', 'dromologion', 'ores', 'oraria', 'ola'
            ],
            requiredAny: [
                'προγραμμα', 'δρομολογια', 'δρομολογιων', 'ωρεσ', 'ωραρια',
                'programma', 'dromologia', 'dromologion', 'ores', 'oraria'
            ]
        },
        /* 03. distanceGps */
        distanceGps: {
            priority: 96,
            phrases: [
                'ποσο απεχω', 'ποση αποσταση', 'ποτε φτανω',
                'σε ποση ωρα φτανω', 'αποσταση gps', 'διαδρομη gps',
                'ποσο θελω για να φτασω στο καραβι',
                'ποση ωρα θελω για να φτασω στο καραβι',
                'ποσο θελω για να φτασω στο πλοιο',
                'poso apexo', 'posi apostasi', 'pote ftano',
                'se posi ora ftano', 'apostasi gps', 'diadromi gps',
                'poso thelo gia na ftaso sto karavi',
                'posi ora thelo gia na ftaso sto karavi',
                'poso thelo gia na ftaso sto ploio'
            ],
            keywords: [
                'αποσταση', 'απεχω', 'φτανω', 'αφιξη',
                'διαδρομη', 'προορισμοσ', 'φτασω', 'καραβι', 'πλοιο', 'gps',
                'apostasi', 'apexo', 'ftano', 'ftaso', 'afixi',
                'diadromi', 'proorismos', 'karavi', 'ploio'
            ],
            requiredAny: [
                'αποσταση', 'απεχω', 'φτανω', 'αφιξη', 'διαδρομη',
                'apostasi', 'apexo', 'ftano', 'ftaso', 'afixi', 'diadromi'
            ]
        },
        /* 04. vesselPosition */
        vesselPosition: {
            priority: 94,
            phrases: [
                'θεση πλοιων', 'που ειναι τα πλοια',
                'που βρισκονται τα πλοια', 'δειτε τον χαρτη',
                'πλοια ανατολικα', 'πλοια δυτικα',
                'δουλευουν ανατολικα', 'δουλευουν δυτικα',
                'σε ποια προβλητα δουλευουν τα καραβια', 'σε ποια προβλητα δουλευουν τα πλοια',
                'που δουλευουν', 'που δουλευουν τα καραβια', 'που δουλευουν τα πλοια',
                'ποιες προβλητες δουλευουν', 'απο ποιες προβλητες φευγουν τα καραβια', 'απο ποιες προβλητες φευγουν τα πλοια',
                'τα καραβια δουλευουν ανατολικα η δυτικα', 'τα πλοια δουλευουν ανατολικα η δυτικα',
                'προσ τα που πανε τα πλοια',
                'thesi ploion', 'pou einai ta ploia',
                'pou vriskontai ta ploia', 'deite ton xarti',
                'ploia anatolika', 'ploia ditika',
                'douleuoun anatolika', 'douleuoun ditika',
                'se poia provlita doulevoun ta karavia', 'se poia provlita doulevoun ta ploia',
                'pou doulevoun', 'pou doulevoun ta karavia', 'pou doulevoun ta ploia',
                'poies provlites doulevoun', 'apo poies provlites feugoun ta karavia', 'apo poies provlites feugoun ta ploia',
                'ta karavia doulevoun anatolika i dutika', 'ta ploia doulevoun anatolika i dutika',
                'pros ta pou pane ta ploia'
            ],
            keywords: [
                'θεση', 'πλοιων', 'πλοια', 'χαρτησ', 'χαρτη',
                'ανατολικα', 'δυτικα', 'traffic', 'tracking',
                'thesi', 'ploion', 'ploia', 'xartis', 'xarti',
                'anatolika', 'ditika'
            ],
            requiredAny: [
                'θεση', 'χαρτησ', 'χαρτη', 'ανατολικα', 'δυτικα',
                'traffic', 'tracking', 'thesi', 'xartis', 'xarti',
                'anatolika', 'ditika'
            ]
        },
        /* 05. gps */
        gps: {
            priority: 85,
            phrases: [
                'ζωντανη θεση', 'live traffic', 'real time traffic',
                'zontani thesi'
            ],
            keywords: ['gps', 'live', 'traffic', 'zontani'],
            requiredAny: ['gps', 'live', 'traffic', 'zontani']
        },
        /* 06. next */
        next: {
            priority: 80,
            phrases: [
                'επομενο πλοιο', 'ποτε φευγει',
                'επομενο απο ριο', 'επομενο απο αντιρριο', 'ποση ωρα',
                'ποτε φευγει αυριο', 'αυριο πρωι', 'μετα τισ 10', 'μετα τις 10',
                'τι ωρα εχει καραβι αυριο', 'τι ωρα εχει πλοιο αυριο',
                'τι ωρεσ εχει καραβι αυριο', 'τι ωρεσ εχει πλοιο αυριο',
                'αυριο τι ωρα εχει καραβι', 'αυριο τι ωρα εχει πλοιο',
                'epomeno ploio', 'pote feugei',
                'epomeno apo rio', 'epomeno apo antirrio', 'posi ora',
                'pote feugei aurio', 'aurio proi', 'meta tis 10',
                'ti ora exei karavi aurio', 'ti ora exei ploio aurio',
                'ti ores exei karavi aurio', 'ti ores exei ploio aurio',
                'aurio ti ora exei karavi', 'aurio ti ora exei ploio'
            ],
            keywords: [
                'επομενο', 'ποτε', 'φευγει', 'αναχωρηση',
                'τι', 'ωρα', 'ωρεσ', 'εχει', 'αυριο', 'καραβι',
                'τωρα', 'next', 'πλοιο',
                'epomeno', 'pote', 'feugei', 'anaxorisi',
                'ti', 'ora', 'ores', 'exei', 'aurio', 'karavi',
                'tora', 'ploio'
            ],
            requiredAny: [
                'επομενο', 'ποτε', 'φευγει', 'αναχωρηση',
                'ωρα', 'ωρεσ', 'αυριο', 'καραβι',
                'epomeno', 'pote', 'feugei', 'anaxorisi',
                'ora', 'ores', 'aurio', 'karavi'
            ]
        },
        /* 07. status */
        status: {
            priority: 75,
            phrases: [
                'ειναι ανοιχτη', 'ειναι κλειστη',
                'λειτουργει η γραμμη', 'δουλευει η γραμμη',
                'εκτελουνται δρομολογια',
                'δουλευουν τα καραβια', 'δουλευουν τα πλοια',
                'γίνονται δρομολογια', 'εχει δρομολογια',
                'εχει απαγορευτικο', 'υπαρχει απαγορευτικο',
                'ειναι ανοιχτο το πορθμειο', 'ειναι κλειστο το πορθμειο',
                'einai anoichti', 'einai kleisti',
                'leitourgei i grammi', 'doulevei i grammi',
                'douleuei i grammi', 'ektelountai dromologia',
                'douleuoun ta karavia', 'douleuoun ta ploia',
                'ginontai dromologia', 'exei dromologia',
                'exei apagoreutiko', 'yparxei apagoreutiko',
                'einai anoichto to porthmeio', 'einai kleisto to porthmeio'
            ],
            keywords: [
                'ανοιχτη', 'ανοιχτο', 'κλειστη', 'κλειστο',
                'λειτουργει', 'λειτουργια', 'δουλευουν',
                'κατασταση', 'απαγορευτικο',
                'status', 'open', 'close', 'εκτελουνται',
                'anoichti', 'anoichto', 'kleisti', 'kleisto',
                'leitourgei', 'leitourgia', 'douleuoun',
                'katastasi', 'apagoreutiko', 'ektelountai'
            ],
            requiredAny: [
                'ανοιχτη', 'ανοιχτο', 'κλειστη', 'κλειστο',
                'λειτουργει', 'δουλευουν', 'κατασταση',
                'απαγορευτικο', 'εκτελουνται',
                'anoichti', 'anoichto', 'kleisti', 'kleisto',
                'leitourgei', 'douleuoun', 'katastasi',
                'apagoreutiko', 'ektelountai'
            ]
        },
        /* 08. prices */
        prices: {
            priority: 70,
            phrases: [
                'ποσο κοστιζει', 'ποσο κανει',
                'τιμεσ ναυλου', 'τιμη εισιτηριου',
                'poso kostizei', 'poso kanei',
                'times naulou', 'timi eisitiriou'
            ],
            keywords: [
                'τιμη', 'τιμεσ', 'ποσο', 'κοστοσ', 'κοστιζει',
                'εισιτηριο', 'εισιτηρια', 'ναυλοσ',
                'ιχ', 'μηχανη', 'φορτηγο',
                'timi', 'times', 'poso', 'kostos', 'kostizei',
                'eisitirio', 'eisitiria', 'naulos',
                'ix', 'mixani', 'fortigo'
            ],
            requiredAny: [
                'τιμη', 'τιμεσ', 'ποσο', 'κοστοσ',
                'κοστιζει', 'εισιτηριο', 'ναυλοσ',
                'timi', 'times', 'poso', 'kostos',
                'kostizei', 'eisitirio', 'naulos'
            ]
        },
        /* 09. forecast */
              forecast: {
            priority: 88,
            phrases: [
                'προγνωση καιρου', 'καιροσ αυριο', 'τι καιρο θα κανει αυριο',
                'τι καιρο θα κανει αυριο στο ριο', 'καιροσ αυριο στο ριο',
                'θα εχει απαγορευτικο', 'θα βγαλει απαγορευτικο',
                'υπαρχει απαγορευτικο αυριο', 'απαγορευτικο αυριο',
                'θα φυσάει αυριο', 'τι ανεμο θα εχει αυριο',
                'windfinder', 'meteo',
                'prognosi kairou', 'kairos aurio',
                'ti kairo tha kanei aurio',
                'ti kairo tha kanei aurio sto rio',
                'kairos aurio sto rio',
                'tha exei apagoreutiko',
                'tha vgalei apagoreutiko',
                'yparxei apagoreutiko aurio',
                'apagoreutiko aurio',
                'tha fisaei aurio',
                'ti anemo tha exei aurio'
            ],
            keywords: [
                'προγνωση', 'καιροσ', 'αυριο', 'απαγορευτικο',
                'ανεμοσ', 'φυσάει', 'windfinder', 'meteo',
                'prognosi', 'kairos', 'aurio', 'apagoreutiko',
                'anemos', 'fisaei'
            ],
            requiredAny: [
                'προγνωση', 'καιροσ', 'ανεμοσ', 'φυσάει', 'απαγορευτικο',
                'windfinder', 'meteo',
                'prognosi', 'kairos', 'anemos', 'fisaei', 'apagoreutiko'
            ]
        },
        /* 10. weather */
        weather: {
            priority: 65,
            phrases: [
                'καιροσ τωρα', 'τι ανεμο εχει',
                'ποσα μποφορ', 'τι θερμοκρασια εχει',
                'ποσο αερα εχει', 'τι αερα εχει',
                'εχει αερα στο ριο αντιρριο', 'εχει αερα στο πορθμειο',
                'ποσο φυσαει',
                'kairos tora', 'ti anemo exei',
                'posa mpofor', 'posa bofor', 'bofor tora',
                'beaufort', 'beafort', 'beufort', 'bf', 'wind',
                'ti thermokrasia exei',
                'poso aera exei', 'ti aera exei',
                'exei aera sto rio antirrio', 'exei aera sto porthmeio',
                'poso fisaei'
            ],
            keywords: [
                'καιροσ', 'ανεμοσ', 'θερμοκρασια',
                'μποφορ', 'weather', 'wind',
                'kairos', 'anemos', 'thermokrasia',
                'mpofor', 'bofor', 'bofort', 'beaufort', 'bf'
            ],
            requiredAny: [
                'καιροσ', 'ανεμοσ', 'θερμοκρασια',
                'μποφορ', 'kairos', 'anemos',
                'thermokrasia', 'mpofor', 'bofor',
                'bofort', 'beaufort', 'bf', 'wind'
            ]
        },
        /* 11. install */
        install: {
            priority: 64,
            phrases: [
                'εγκατασταση εφαρμογησ', 'προσθηκη στην αρχικη οθονη',
                'πως εγκαθιστω την εφαρμογη', 'βαλε την εφαρμογη στο κινητο',
                'install app', 'add to home screen',
                'egkatastasi efarmogis', 'prosthiki stin arxiki othoni',
                'pos egkathisto tin efarmogi', 'vale tin efarmogi sto kinito'
            ],
            keywords: [
                'εγκατασταση', 'εφαρμογη', 'αρχικη', 'οθονη',
                'install', 'home', 'screen',
                'egkatastasi', 'efarmogi', 'arxiki', 'othoni'
            ],
            requiredAny: [
                'εγκατασταση', 'αρχικη', 'οθονη',
                'install', 'home', 'screen',
                'egkatastasi', 'arxiki', 'othoni'
            ]
        },
        /* 12. navigation */
        navigation: {
            priority: 98,
            phrases: [
                'πως φτανω στο ριο', 'πως παω στο ριο',
                'πλοηγηση προς το ριο', 'πλοηγηση προς την προβλητα ριου',
                'διαδρομη για το ριο', 'google maps ριο',
                'πως φτανω στο αντιρριο', 'πως παω στο αντιρριο',
                'πλοηγηση προς το αντιρριο', 'πλοηγηση προς την προβλητα αντιρριου',
                'διαδρομη για το αντιρριο', 'google maps αντιρριο',
                'pos ftano sto rio', 'pos pao sto rio',
                'ploigisi pros to rio', 'ploigisi pros tin provlita rio',
                'diadromi gia to rio', 'google maps rio',
                'pos ftano sto antirrio', 'pos pao sto antirrio',
                'ploigisi pros to antirrio', 'ploigisi pros tin provlita antirrio',
                'diadromi gia to antirrio', 'google maps antirrio'
            ],
            keywords: [
                'πως', 'φτανω', 'παω', 'πλοηγηση', 'διαδρομη',
                'οδηγιες', 'maps',
                'ftano', 'pao', 'ploigisi', 'diadromi', 'odigies'
            ],
            requiredAny: [
                'φτανω', 'παω', 'πλοηγηση', 'διαδρομη', 'οδηγιες', 'maps',
                'ftano', 'pao', 'ploigisi', 'diadromi', 'odigies'
            ]
        },
        /* 13. liveApp */
        liveApp: {
            priority: 108,
            phrases: [
                'live', 'rio antirrio live', 'live εφαρμογη',
                'εφαρμογη live', 'επισκεψη στην εφαρμογη',
                'live app', 'rio antirrio live app',
                'live efarmogi', 'efarmogi live'
            ],
            keywords: ['live', 'εφαρμογη', 'app', 'efarmogi'],
            requiredAny: ['live']
        },
        /* 14. shipsDetails */
        shipsDetails: {
            priority: 107,
            phrases: [
                'στοιχεια πλοιων', 'ποσα πλοια ειναι στη γραμμη',
                'ποσα πλοια δουλευουν στη γραμμη',
                'ποια πλοια δουλευουν στη γραμμη',
                'ποια πλοια ειναι στη γραμμη', 'ονοματα πλοιων',
                'πληροφοριες για τα πλοια', 'χαρακτηριστικα πλοιων',
                'stoixeia ploion', 'posa ploia einai sti grammi',
                'posa ploia doulevoun sti grammi',
                'poia ploia doulevoun sti grammi',
                'poia ploia einai sti grammi', 'onomata ploion',
                'plirofories gia ta ploia', 'xaraktiristika ploion'
            ],
            keywords: [
                'στοιχεια', 'πλοιων', 'ονοματα', 'χαρακτηριστικα',
                'stoixeia', 'ploion', 'onomata', 'xaraktiristika'
            ],
            requiredAny: ['στοιχεια', 'ονοματα', 'χαρακτηριστικα', 'stoixeia', 'onomata', 'xaraktiristika']
        },
        /* 15. liveDepartures */
        liveDepartures: {
            priority: 66,
            phrases: [
                'live αναχωρησεις', 'ζωντανες αναχωρησεις',
                'live departures', 'που βλεπω live αναχωρησεις',
                'live anaxoriseis', 'zontanes anaxoriseis',
                'pou vlepo live anaxoriseis'
            ],
            keywords: [
                'live', 'ζωντανες', 'αναχωρησεις', 'departures',
                'anaxoriseis', 'zontanes'
            ],
            requiredAny: [
                'live', 'ζωντανες', 'αναχωρησεις',
                'departures', 'anaxoriseis', 'zontanes'
            ]
        },
        /* 16. facebook */
        facebook: {
            priority: 62,
            phrases: [
                'εχετε facebook', 'που θα σας βρω στο facebook',
                'facebook rio antirrio', 'σελιδα στο facebook',
                'θα μας βρειτε στο facebook',
                'exete facebook', 'pou tha sas vro sto facebook',
                'selida sto facebook', 'tha mas vreite sto facebook'
            ],
            keywords: ['facebook', 'fb'],
            requiredAny: ['facebook', 'fb']
        },
        /* 17. social — μικρή, ασφαλής ομάδα ευγενικών/κοινωνικών φράσεων.
         * Exact phrases only: δεν χρησιμοποιείται για γενικό semantic matching. */
        social: {
            priority: 120,
            phrases: [
                /* Χαιρετισμός */
                'γεια', 'γεια σου', 'γεια σας', 'χαιρετε',
                'καλημερα', 'καλησπερα', 'καληνυχτα', 'καλο βραδυ',
                'geia', 'geia sou', 'geia sas',
                'kalimera', 'kalispera', 'kalinixta', 'kalinuxta', 'kalo vradi',
                'hello', 'hi',

                /* Ευχαριστία */
                'ευχαριστω', 'ευχαριστω πολυ', 'σε ευχαριστω',
                'να εισαι καλα', 'να ειστε καλα',
                'euxaristo', 'euxaristo poli',
                'na eisai kala', 'na eiste kala',
                'thanks', 'thank you',

                /* Ευγενική άδεια για ερώτηση */
                'μπορω να ρωτησω', 'μπορω να ρωτησω κατι',
                'να ρωτησω', 'να ρωτησω κατι', 'θελω να ρωτησω κατι',
                'mporo na rotiso', 'mporo na rotiso kati',
                'na rotiso', 'na rotiso kati', 'thelo na rotiso kati',

                /* Θετική αντίδραση */
                'τελεια', 'μπραβο', 'ενταξει', 'καταλαβα', 'σωστα',
                'teleia', 'bravo', 'entaxi', 'katalava', 'sosta', 'ok',

                /* Αποχαιρετισμός */
                'αντιο', 'τα λεμε', 'καλη συνεχεια', 'καλο ταξιδι',
                              'antio', 'ta leme', 'kali sinexeia', 'kalo taxidi',
                'bye', 'goodbye',

                /* Απάντηση σε ευχαριστία */
                'παρακαλω', 'parakalo'
            ],
            keywords: [],
            requiredAny: []
        },
        /* 18. assistantCapabilities */
        assistantCapabilities: {
            priority: 115,
            phrases: [
                'βοηθεια', 'help', 'voitheia',
                'τι ξερεις', 'ποσα ξερεις', 'τι γνωριζεις', 'ποσα γνωριζεις',
                'τι μπορεις να κανεις', 'τι μπορεις να απαντησεις',
                'τι μπορω να ρωτησω', 'τι ερωτησεις μπορω να κανω',
                'σε τι μπορεις να απαντησεις',
                'τι πληροφοριες παρεχεις', 'τι πληροφοριες δινεις',
                'τι πληροφοριες μπορω να εχω',
                'πως μπορεις να με βοηθησεις', 'δειξε μου τι μπορεις',
                'με τι μπορεις να με βοηθησεις', 'τι μπορω να σε ρωτησω',
                'ποιες πληροφοριες εχεις', 'τι πληροφοριες ξερεις',
                'τι υπηρεσιες παρεχεις', 'τι δυνατοτητες εχεις',
                'τι μπορει να κανει ο assistant', 'τι μπορει να κανει ο βοηθος',
                'τι ερωτησεις απαντας', 'για τι πραγματα μπορω να σε ρωτησω',
                'τι ξερεις για τη γραμμη', 'τι γνωριζεις για τη γραμμη',
                'τι ξερεις για το ριο αντιρριο', 'τι γνωριζεις για το ριο αντιρριο',
                'ti xereis', 'ti ksereis', 'posa xereis', 'ti gnorizeis', 'posa gnorizeis',
                'ti mporeis na kaneis', 'ti mporeis na apantiseis',
                'ti mporo na rotiso', 'ti erotiseis mporo na kano',
                'se ti mporeis na apantiseis',
                'ti plirofories parexeis', 'ti plirofories dineis',
                'ti plirofories mporo na exo', 'pos mporeis na me voithiseis',
                'me ti mporeis na me voithiseis', 'ti mporo na se rotiso',
                'poies plirofories exeis', 'ti plirofories xereis',
                'ti ipiresies parexeis', 'ti dinatotites exeis',
                'ti mporei na kanei o assistant', 'ti mporei na kanei o voithos',
                'ti erotiseis apantas', 'gia ti pragmata mporo na se rotiso',
                'ti xereis gia ti grammi', 'ti gnorizeis gia ti grammi',
                'ti xereis gia to rio antirrio', 'ti gnorizeis gia to rio antirrio'
            ],
            keywords: ['βοηθεια','help','voitheia','ξερεις','γνωριζεις','xereis','gnorizeis'],
            requiredAny: ['βοηθεια','help','voitheia','ξερεις','γνωριζεις','xereis','gnorizeis']
        },
        /* 19. assistantAbout */
        assistantAbout: {
            priority: 115,
            phrases: [
                'ποιος εισαι', 'ποια εισαι', 'ποιο εισαι', 'τι εισαι',
                'τι ειναι ο rio antirrio ai assistant',
                'τι ειναι το rio antirrio assistant', 'τι ειναι το rio antirrio live', 'τι ειναι το rio antirrio ferries',
                'σε ποιον ανηκει το rio antirrio ferries', 'σε ποιον ανηκει το rio antirrio live', 'σε ποιον ανηκει το rio antirrio assistant',
                'ποιος ειναι πισω απο το rio antirrio ferries', 'ποιος ειναι πισω απο το rio antirrio live', 'ποιος ειναι πισω απο το rio antirrio assistant',
                'ποιος εφτιαξε το rio antirrio ferries', 'ποιος εφτιαξε το rio antirrio live', 'ποιος εφτιαξε το rio antirrio assistant',
                'ποιος δημιουργησε το rio antirrio ferries', 'ποιος δημιουργησε το rio antirrio live', 'ποιος δημιουργησε το rio antirrio assistant',
                'ποιος σε εφτιαξε', 'ποιος σε δημιουργησε', 'ποιος ειναι ο δημιουργος σου', 'ποιος ειναι ο δημιουργος',
                'ποιος σε διαχειριζεται', 'ποιος διαχειριζεται τη σελιδα', 'ποιος διαχειριζεται την εφαρμογη', 'ποιος διαχειριζεται τον assistant',
                'σε ποιον ανηκει η σελιδα', 'σε ποιον ανηκει η εφαρμογη', 'σε ποιον ανηκει ο assistant',
                'ποιος ειναι πισω απο την υπηρεσια', 'ποιος το λειτουργει', 'ποιος το συντηρει',
                'ειναι ιδιωτικη υπηρεσια', 'ειναι ιδιωτικη πρωτοβουλια', 'ειναι επισημη υπηρεσια',
                'ανηκει στο λιμενικο', 'ανηκει στο λιμεναρχειο', 'ανηκει στις πλοιοκτητριες εταιρειες', 'ειναι του κρατους',
                'poios eisai', 'poia eisai', 'poio eisai', 'ti eisai',
                'ti einai o rio antirrio ai assistant',
                'ti einai to rio antirrio assistant', 'ti einai to rio antirrio live', 'ti einai to rio antirrio ferries',
                'se poion anikei to rio antirrio ferries', 'se poion anikei to rio antirrio live', 'se poion anikei to rio antirrio assistant',
                'poios einai piso apo to rio antirrio ferries', 'poios einai piso apo to rio antirrio live', 'poios einai piso apo to rio antirrio assistant',
                'poios eftiaxe to rio antirrio ferries', 'poios eftiaxe to rio antirrio live', 'poios eftiaxe to rio antirrio assistant',
                'poios se eftiaxe', 'poios se dimiourgise', 'poios einai o dimiourgos sou', 'poios einai o dimiourgos',
                'poios se diaxeirizetai', 'poios se diaxeirizete',
                'poios diaxeirizetai ti selida', 'poios diaxeirizete ti selida',
                'poios diaxirizetai ti selida', 'poios diaxirizete ti selida',
                'poios diaxeirizetai tin selida', 'poios diaxeirizete tin selida',
                'poios diaxeirizetai tin efarmogi', 'poios diaxeirizete tin efarmogi',
                'poios diaxeirizetai ton assistant', 'poios diaxeirizete ton assistant',
                'se poion anikei i selida', 'se poion anikei i efarmogi', 'se poion anikei o assistant',
                'poios einai piso apo tin ipiresia', 'poios to leitourgei', 'poios to sintirei',
                'einai idiotiki ipiresia', 'einai idiotiki protovoulia', 'einai episimi ipiresia',
                'anikei sto limeniko', 'anikei sto limenarxeio', 'anikei stis ploioktitries etaireies', 'einai tou kratous'
            ],
            keywords: ['assistant','ferries','live','εφαρμογη','app','υπηρεσια'],
            requiredAny: ['assistant','ferries','live','εφαρμογη','app','υπηρεσια']
        },
        /* 20. passengerFare */
        passengerFare: {
            priority: 111,
            phrases: [
                'οι επιβατες πληρωνουν', 'πληρωνουν οι επιβατες',
                'ειναι δωρεαν οι επιβατες', 'κοστος επιβατη',
                'oi epivates plironoun', 'plironoun oi epivates',
                'einai dorean oi epivates', 'kostos epivati'
            ],
            keywords: [
                'επιβατες', 'επιβατης', 'δωρεαν', 'πληρωνουν',
                'epivates', 'epivatis', 'dorean', 'plironoun'
            ],
            requiredAny: ['επιβατες', 'επιβατης', 'epivates', 'epivatis']
        },
        /* 21. tripDuration */
        tripDuration: {
            priority: 110,
            phrases: [
                'ποσο χρονο κανει να περασει απεναντι',
                'ποσο διαρκει η διαδρομη', 'ποση ειναι η διαρκεια της διαδρομης',
                'χρονος διελευσης ριο αντιρριο', 'χρονος διαδρομης ριο αντιρριο',
                'ποσο χρονο χρειαζεται το πλοιο για τη διαδρομη',
                'poso xrono kanei na perasei apenanti',
                'poso diarkei i diadromi', 'posi einai i diarkeia tis diadromis',
                'xronos dielefsis rio antirrio',
                'poso xrono xreiazetai to ploio gia ti diadromi'
            ],
            keywords: ['διαρκεια', 'διαρκει', 'diarkeia', 'diarkei'],
            requiredAny: ['διαρκεια', 'διαρκει', 'diarkeia', 'diarkei']
        },
        /* 22. payment */
        payment: {
            priority: 109,
            phrases: [
                'τροπος πληρωμης', 'πως πληρωνω', 'που πληρωνω',
                'δεχεται pos', 'μετρητα η καρτα', 'χρειαζεται κρατηση',
                'tropos pliromis', 'pos plirono', 'pou plirono',
                'dexetai pos', 'metrita i karta', 'xreiazetai kratisi'
            ],
            keywords: ['πληρωμη', 'πληρωνω', 'μετρητα', 'καρτα', 'κρατηση',
                       'pliromi', 'plirono', 'metrita', 'karta', 'kratisi'],
            requiredAny: ['πληρωμη', 'πληρωνω', 'pliromi', 'plirono',
                          'μετρητα', 'metrita', 'καρτα', 'karta',
                          'κρατηση', 'kratisi']
        },
        /* 23. contacts */
        contacts: {
            priority: 60,
            phrases: [
                'τηλεφωνο λιμεναρχειου', 'τηλεφωνο λιμενικου',
                'τηλεφωνο για πληροφοριες', 'στοιχεια επικοινωνιας',
                'επικοινωνια με το λιμεναρχειο', 'πληροφοριες λιμεναρχειου',
                'που να τηλεφωνησω', 'ποιο ειναι το τηλεφωνο',
                'tilefono limenarxeiou', 'tilefono limenikou',
                'tilefono gia plirofories', 'stoixeia epikoinonias',
                'epikoinonia me to limenarxeio', 'plirofories limenarxeiou',
                'pou na tilefoniso', 'poio einai to tilefono',
                'telephone', 'phone number'
            ],
            keywords: [
                'τηλεφωνο', 'τηλ', 'λιμεναρχειο', 'λιμενικο',
                'επικοινωνια', 'πληροφοριες', 'τηλεφωνικως',
                'tilefono', 'til', 'limenarxeio', 'limeniko',
                'epikoinonia', 'plirofories', 'tilefonikos',
                'telephone', 'phone'
            ],
            requiredAny: [
                'τηλεφωνο', 'τηλ', 'λιμεναρχειο', 'λιμενικο',
                'επικοινωνια', 'πληροφοριες',
                'tilefono', 'til', 'limenarxeio', 'limeniko',
                'epikoinonia', 'plirofories',
                'telephone', 'phone'
            ]
        },
        /* 24. history */
        history: {
            priority: 50,
            phrases: [
                'ιστορια πορθμειου', 'ιστορικα στοιχεια',
                'istoria porthmeiou', 'istorika stoixeia'
            ],
            keywords: [
                'ιστορια', 'ιστορικα', 'πορθμειο',
                'istoria', 'istorika', 'porthmeio'
            ],
            requiredAny: ['ιστορια', 'ιστορικα', 'istoria', 'istorika']
        },
        /* 25. photos */
        photos: {
            priority: 45,
            phrases: [
                'παλιεσ φωτογραφιεσ', 'ριο καποτε',
                'φωτογραφιεσ αρχειου',
                'palies fotografies', 'rio kapote',
                'fotografies arxeiou'
            ],
            keywords: [
                'φωτογραφια', 'φωτογραφιεσ',
                'παλιεσ', 'αρχειο', 'καποτε',
                'fotografia', 'fotografies',
                'palies', 'arxeio', 'kapote'
            ],
            requiredAny: [
                'φωτογραφια', 'φωτογραφιεσ',
                'παλιεσ', 'καποτε',
                'fotografia', 'fotografies',
                'palies', 'kapote'
            ]
        }
    };

    global.RioAIKnowledge = Object.freeze({
        version: '1.0.0',
        intents: INTENTS
    });

})(window);
