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
                'poso thelo gia na ftaso sto ploio',
                'πως παω στο καραβι', 'πως παω στο πλοιο',
                'ποσο θελω για την προβλητα', 'ποσο θελω μεχρι την προβλητα',
                'pos pao sto karavi', 'poso thelo gia tin provlita'
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
                'σε ποια προβλητα δουλευουν τα καραβια',
                'σε ποια προβλητα δουλευουν τα πλοια',
                'που δουλευουν', 'που δουλευουν τα καραβια',
                'που δουλευουν τα πλοια',
                'ποιες προβλητες δουλευουν',
                'απο ποιες προβλητες φευγουν τα καραβια',
                'απο ποιες προβλητες φευγουν τα πλοια',
                'τα καραβια δουλευουν ανατολικα η δυτικα',
                'τα πλοια δουλευουν ανατολικα η δυτικα',
                'προσ τα που πανε τα πλοια',
                'thesi ploion', 'pou einai ta ploia',
                'pou vriskontai ta ploia', 'deite ton xarti',
                'ploia anatolika', 'ploia ditika',
                'douleuoun anatolika', 'douleuoun ditika',
                'se poia provlita doulevoun ta karavia',
                'se poia provlita doulevoun ta ploia',
                'pou doulevoun', 'pou doulevoun ta karavia',
                'pou doulevoun ta ploia',
                'poies provlites doulevoun',
                'apo poies provlites feugoun ta karavia',
                'apo poies provlites feugoun ta ploia',
                'ta karavia doulevoun anatolika i dutika',
                'ta ploia doulevoun anatolika i dutika',
                'pros ta pou pane ta ploia',
                'το καραβι απο ποια προβλητα φευγει',
                'το πλοιο απο ποια προβλητα φευγει',
                'to karavi apo poia provlita feugei',
                'απο που παιρνω το καραβι', 'απο που παιρνω το πλοιο',
                'που παιρνω το καραβι', 'που παιρνω το πλοιο',
                'που ειναι η προβλητα', 'που ειναι τα καραβια',
                'που πρεπει να παω για το καραβι',
                'απο ποια πλευρα φευγει το καραβι',
                'σε ποια πλευρα ειναι τα καραβια',
                'δειξε μου τη θεση των πλοιων', 'δειξε μου την κινηση των πλοιων',
                'apo pou pairno to karavi', 'apo pou pairno to ploio',
                'apo pou perno to karavi', 'apo pou perno to ploio',
                'apo pou painrno to karavi', 'apo pou painrno to ploio',
                'pou pairno to karavi', 'pou pairno to ploio',
                'pou einai i provlita', 'pou einai ta karavia',
                'pou prepei na pao gia to karavi',
                'apo poia plevra feugei to karavi',
                'se poia plevra einai ta karavia',
                'deikse mou ti thesi ton ploion', 'deikse mou tin kinisi ton ploion'
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
                'times naulou', 'timi eisitiriou',
                'ποσα πληρωνει το μηχανακι',
                'ποσο πληρωνει το μηχανακι',
                'ποσο πληρωνει το μοτο',
                'posa plironei to mixanaki',
                'poso plironei to moto'
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
            priority: 69,
            phrases: [
                'προγνωση καιρου', 'καιροσ αυριο',
                'τι καιρο θα κανει', 'τι καιρο θα εχει',
                'θα εχει απαγορευτικο',
                'prognoση kairou', 'prognosi kairou',
                'kairos aurio', 'ti kairo tha kanei',
                'ti kairo tha exei', 'tha exei apagoreutiko'
            ],
            keywords: [
                'προγνωση', 'αυριο', 'καιροσ',
                'καιρο', 'καιρου', 'forecast',
                'prognosi', 'aurio', 'kairos',
                'kairo', 'kairou'
            ],
            requiredAny: [
                'προγνωση', 'καιροσ', 'καιρο', 'καιρου',
                'forecast', 'prognosi', 'kairos', 'kairo', 'kairou'
            ]
        },

        /* 10. weather */
        weather: {
            priority: 68,
            phrases: [
                'τι καιρο εχει', 'καιροσ τωρα',
                'θερμοκρασια τωρα', 'ποσα μποφορ',
                'τι ανεμο εχει', 'καιρικεσ συνθηκεσ',
                'ti kairo exei', 'kairos tora',
                'thermokrasia tora', 'posa mpofor',
                'ti anemo exei', 'kairikes synthikes'
            ],
            keywords: [
                'καιροσ', 'καιρο', 'θερμοκρασια',
                'μποφορ', 'ανεμοσ', 'ανεμο', 'καιρικεσ',
                'weather', 'kairos', 'kairo',
                'thermokrasia', 'mpofor', 'anemos', 'anemo'
            ],
            requiredAny: [
                'καιροσ', 'καιρο', 'θερμοκρασια',
                'μποφορ', 'ανεμοσ', 'ανεμο',
                'weather', 'kairos', 'kairo',
                'thermokrasia', 'mpofor', 'anemos', 'anemo'
            ]
        },

        /* 11. passengerFare */
        passengerFare: {
            priority: 72,
            phrases: [
                'οι επιβατεσ πληρωνουν',
                'πληρωνουν οι επιβατεσ',
                'ο επιβατησ πληρωνει',
                'οι πεζοι πληρωνουν',
                'πληρωνουν οι πεζοι',
                'πεζοσ πληρωνει',
                'ειναι δωρεαν οι επιβατεσ',
                'οι επιβατεσ ειναι δωρεαν',
                'ειναι δωρεαν οι πεζοι',
                'oi epivates plironoun',
                'plironoun oi epivates',
                'o epivatis plironei',
                'oi pezoi plironoun',
                'plironoun oi pezoi',
                'pezos plironei',
                'einai dorean oi epivates',
                'oi epivates einai dorean',
                'einai dorean oi pezoi',
                'οι πεζοι πληρωνουν στο καραβι',
                'oi pezoi plironoun sto karavi'
            ],
            keywords: [
                'επιβατησ', 'επιβατεσ', 'πεζοσ', 'πεζοι',
                'πληρωνει', 'πληρωνουν', 'δωρεαν',
                'epivatis', 'epivates', 'pezos', 'pezoi',
                'plironei', 'plironoun', 'dorean'
            ],
            requiredAny: [
                'επιβατησ', 'επιβατεσ', 'πεζοσ', 'πεζοι',
                'epivatis', 'epivates', 'pezos', 'pezoi'
            ]
        },

        /* 12. payment */
        payment: {
            priority: 67,
            phrases: [
                'πως πληρωνω', 'που πληρωνω',
                'πληρωμη με καρτα', 'πληρωμη μετρητα',
                'εχει pos', 'δεχεται καρτα',
                'που βγαζω εισιτηριο', 'πως βγαζω εισιτηριο',
                'χρειαζεται κρατηση', 'κανω κρατηση',
                'pos plirono', 'pou plirono',
                'pliromi me karta', 'pliromi metrita',
                'exei pos', 'dexetai karta',
                'pou vgazo eisitirio', 'pos vgazo eisitirio',
                'xreiazetai kratisi', 'kano kratisi',
                'πρεπει να κλεισω θεση', 'κλεινω εισιτηριο απο πριν',
                'βγαζω εισιτηριο απο πριν', 'υπαρχει online κρατηση',
                'μπορω να κανω κρατηση online', 'χρειαζεται να κλεισω εισιτηριο',
                'prepei na kleiso thesi', 'kleino eisitirio apo prin',
                'vgazo eisitirio apo prin', 'yparxei online kratisi',
                'mporo na kano kratisi online', 'xreiazetai na kleiso eisitirio'
            ],
            keywords: [
                'πληρωμη', 'πληρωνω', 'καρτα', 'μετρητα',
                'pos', 'εισιτηριο', 'κρατηση',
                'pliromi', 'plirono', 'karta', 'metrita',
                'eisitirio', 'kratisi'
            ],
            requiredAny: [
                'πληρωμη', 'πληρωνω', 'καρτα', 'μετρητα',
                'εισιτηριο', 'κρατηση',
                'pliromi', 'plirono', 'karta', 'metrita',
                'eisitirio', 'kratisi'
            ]
        },

        /* 13. navigation */
        navigation: {
            priority: 66,
            phrases: [
                'πωσ φτανω στο ριο', 'πωσ φτανω στο αντιρριο',
                'πωσ παω στο ριο', 'πωσ παω στο αντιρριο',
                'πλοηγηση στο ριο', 'πλοηγηση στο αντιρριο',
                'πλοηγηση προσ την προβλητα',
                'χαρτησ ριο', 'χαρτησ αντιρριο',
                'pos ftano sto rio', 'pos ftano sto antirrio',
                'pos pao sto rio', 'pos pao sto antirrio',
                'ploigisi sto rio', 'ploigisi sto antirrio',
                'ploigisi pros tin provlita',
                'xartis rio', 'xartis antirrio'
            ],
            keywords: [
                'πλοηγηση', 'φτανω', 'παω', 'διαδρομη',
                'χαρτησ', 'προβλητα',
                'ploigisi', 'ftano', 'pao', 'diadromi',
                'xartis', 'provlita'
            ],
            requiredAny: [
                'πλοηγηση', 'φτανω', 'παω', 'χαρτησ',
                'ploigisi', 'ftano', 'pao', 'xartis'
            ]
        },

        /* 14. emergency */
        emergency: {
            priority: 95,
            phrases: [
                'τηλεφωνο λιμεναρχειου', 'τηλεφωνο λιμενικου',
                'λιμενικο ριο', 'λιμενικο τμημα ριου',
                'επικοινωνια λιμεναρχειο',
                'tilefono limenarxeiou', 'tilefono limenikou',
                'limeniko rio', 'limeniko tmima riou',
                'epikoinonia limenarxeio'
            ],
            keywords: [
                'λιμεναρχειο', 'λιμενικο', 'τηλεφωνο',
                'επικοινωνια', 'emergency',
                'limenarxeio', 'limeniko', 'tilefono', 'epikoinonia'
            ],
            requiredAny: [
                'λιμεναρχειο', 'λιμενικο',
                'limenarxeio', 'limeniko'
            ]
        },

        /* 15. install */
        install: {
            priority: 64,
            phrases: [
                'εγκατασταση εφαρμογησ', 'εγκατασταση εφαρμογη',
                'πωσ βαζω την εφαρμογη', 'πωσ εγκαθιστω',
                'προσθηκη στην αρχικη οθονη',
                'βαλε την εφαρμογη στο κινητο',
                'install app', 'install application',
                'egkatastasi efarmogis', 'egkatastasi efarmogi',
                'pos vazo tin efarmogi', 'pos egkathisto',
                'prosthiki stin arxiki othoni',
                'vale tin efarmogi sto kinito',
                'πως κατεβαζω την εφαρμογη',
                'πως βαζω το rio antirrio live στο κινητο',
                'θελω να βαλω το app στο κινητο',
                'πως το βαζω στην αρχικη οθονη',
                'πως κανω εγκατασταση',
                'πως βαζω εικονιδιο στην αρχικη',
                'μπορω να το εγκαταστησω σαν εφαρμογη',
                'pos katevazo tin efarmogi',
                'pos vazo to rio antirrio live sto kinito',
                'thelo na valo to app sto kinito',
                'pos to vazo stin arxiki othoni',
                'pos kano egkatastasi', 'pos kano install',
                'pos vazo eikonidio stin arxiki',
                'mporo na to egkatastiso san efarmogi',
                'mporo na to egkatastiso san app'
            ],
            keywords: [
                'εγκατασταση', 'εφαρμογη', 'εγκαθιστω',
                'αρχικη', 'οθονη', 'install', 'app',
                'egkatastasi', 'efarmogi', 'egkathisto',
                'arxiki', 'othoni'
            ],
            requiredAny: [
                'εγκατασταση', 'εγκαθιστω',
                'install', 'egkatastasi', 'egkathisto'
            ]
        },

        /* 16. frequency */
        frequency: {
            priority: 82,
            phrases: [
                'καθε ποσο', 'καθε ποτε',
                'ποσο συχνα', 'ανα ποση ωρα',
                'ανα ποσα λεπτα', 'συχνοτητα δρομολογιων',
                'υπαρχουν συχνα δρομολογια',
                'πρωινα δρομολογια',
                'απογευματινα δρομολογια',
                'βραδινα δρομολογια',
                'νυχτερινα δρομολογια',
                'δρομολογια το πρωι',
                'δρομολογια το απογευμα',
                'δρομολογια το βραδυ',
                'δρομολογια τη νυχτα',
                'kathe poso', 'kathe pote',
                'poso sixna', 'ana posi ora',
                'ana posa lepta', 'sixnotita dromologion',
                'yparxoun sixna dromologia',
                'proina dromologia',
                'apogeumatina dromologia',
                'vradina dromologia',
                'nyxterina dromologia',
                'dromologia to proi',
                'dromologia to apogeuma',
                'dromologia to vradi',
                'dromologia ti nyxta'
            ],
            keywords: [
                'συχνοτητα', 'συχνα', 'καθε', 'ανα',
                'λεπτα', 'πρωινα', 'απογευματινα',
                'βραδινα', 'νυχτερινα',
                'sixnotita', 'sixna', 'kathe', 'ana',
                'lepta', 'proina', 'apogeumatina',
                'vradina', 'nyxterina'
            ],
            requiredAny: [
                'συχνοτητα', 'συχνα', 'καθε', 'ανα',
                'sixnotita', 'sixna', 'kathe', 'ana'
            ]
        },

        /* 17. continuousOperation */
        continuousOperation: {
            priority: 83,
            phrases: [
                '24ωρη λειτουργια',
                'λειτουργει ολο το 24ωρο',
                'εχει δρομολογια ολο το βραδυ',
                'σταματαει η γραμμη',
                'ποτε σταματαει η γραμμη',
                'τι ωρα σταματαει η γραμμη',
                'ποτε σταματουν τα δρομολογια',
                '24ori leitourgia',
                'leitourgei olo to 24oro',
                'exei dromologia olo to vradi',
                'stamataei i grammi',
                'pote stamataei i grammi',
                'ti ora stamataei i grammi',
                'pote stamatoun ta dromologia',
                'ποιο ειναι το πρωτο δρομολογιο', 'το πρωτο δρομολογιο',
                'τι ωρα ειναι το πρωτο καραβι', 'τι ωρα ξεκινανε τα καραβια',
                'ποιο ειναι το πρωτο απο ριο', 'ποιο ειναι το πρωτο απο αντιρριο',
                'ποιο ειναι το τελευταιο δρομολογιο', 'το τελευταιο δρομολογιο',
                'τι ωρα ειναι το τελευταιο καραβι', 'μεχρι τι ωρα εχει καραβια',
                'ποιο ειναι το τελευταιο απο ριο', 'ποιο ειναι το τελευταιο απο αντιρριο',
                'poio einai to proto dromologio', 'to proto dromologio',
                'ti ora einai to proto karavi', 'ti ora ksekinane ta karavia',
                'poio einai to proto apo rio', 'poio einai to proto apo antirrio',
                'poio einai to teleutaio dromologio', 'to teleutaio dromologio',
                'ti ora einai to teleutaio karavi', 'mexri ti ora exei karavia',
                'poio einai to teleutaio apo rio', 'poio einai to teleutaio apo antirrio'
            ],
            keywords: [
                '24ωρη', '24ωρο', 'ολο', 'βραδυ',
                'σταματαει', 'σταματουν',
                '24ori', '24oro', 'olo', 'vradi',
                'stamataei', 'stamatoun'
            ],
            requiredAny: [
                '24ωρη', '24ωρο', 'σταματαει', 'σταματουν',
                '24ori', '24oro', 'stamataei', 'stamatoun'
            ]
        },

        /* 18. assistantAbout */
        assistantAbout: {
            priority: 63,
            phrases: [
                'τι ειναι ο rio antirrio ai assistant',
                'τι ειναι ο rio ai assistant',
                'ποιοσ σε εφτιαξε', 'ποιοσ σε δημιουργησε',
                'ποιοσ σε διαχειριζεται',
                'ποιοσ σε ελεγχει',
                'σε ποιον ανηκεισ',
                'που ανηκεισ',
                'ποιοσ ειναι ο ιδιοκτητησ',
                'ποιοσ ειναι πισω απο εσενα',
                'ti einai o rio antirrio ai assistant',
                'ti einai o rio ai assistant',
                'poios se eftiaxe', 'poios se dimiourgise',
                'poios se diaxeirizetai',
                'poios se elegxei',
                'se poion anikeis',
                'pou anikeis',
                'poios einai o idioktitis',
                'poios einai piso apo esena'
            ],
            keywords: [
                'assistant', 'βοηθοσ', 'υπηρεσια',
                'εφτιαξε', 'δημιουργησε', 'διαχειριζεται',
                'ελεγχει', 'ανηκεισ', 'ιδιοκτητησ',
                'voithos', 'ypiresia',
                'eftiaxe', 'dimiourgise', 'diaxeirizetai',
                'elegxei', 'anikeis', 'idioktitis'
            ],
            requiredAny: [
                'assistant', 'βοηθοσ', 'υπηρεσια',
                'εφτιαξε', 'δημιουργησε', 'διαχειριζεται',
                'ελεγχει', 'ανηκεισ', 'ιδιοκτητησ',
                'voithos', 'ypiresia',
                'eftiaxe', 'dimiourgise', 'diaxeirizetai',
                'elegxei', 'anikeis', 'idioktitis'
            ]
        },

        /* 19. assignedVesselUnavailable */
        assignedVesselUnavailable: {
            priority: 97,
            phrases: [
                'ποιο πλοιο δουλευει τωρα',
                'ποιο καραβι δουλευει τωρα',
                'ποιο πλοιο φορτωνει τωρα',
                'ποιο καραβι φορτωνει τωρα',
                'ποιο πλοιο ειναι στην προβλητα',
                'ποιο καραβι ειναι στην προβλητα',
                'ποιο πλοιο φευγει τωρα απο ριο',
                'ποιο καραβι φευγει τωρα απο ριο',
                'ποιο πλοιο φευγει τωρα απο αντιρριο',
                'ποιο καραβι φευγει τωρα απο αντιρριο',
                'ποσα καραβια δουλευουν τωρα',
                'ποσα πλοια δουλευουν τωρα',
                'ποσα καραβια ειναι σε λειτουργια τωρα',
                'ποσα πλοια ειναι σε λειτουργια τωρα',
                'ποσα καραβια ειναι σε υπηρεσια τωρα',
                'ποσα πλοια ειναι σε υπηρεσια τωρα',
                'ποσα καραβια εκτελουν δρομολογια τωρα',
                'ποσα πλοια εκτελουν δρομολογια τωρα',
                'ποια καραβια δουλευουν τωρα',
                'ποια πλοια δουλευουν τωρα',
                'ποιο καραβι εχει βαρδια τωρα',
                'ποιο πλοιο εχει βαρδια τωρα',
                'poio ploio doulevei tora',
                'poio karavi doulevei tora',
                'poio ploio fortonei tora',
                'poio karavi fortonei tora',
                'poio ploio einai stin provlita',
                'poio karavi einai stin provlita',
                'poio ploio feugei tora apo rio',
                'poio karavi feugei tora apo rio',
                'poio ploio feugei tora apo antirrio',
                'poio karavi feugei tora apo antirrio',
                'posa karavia doulevoun tora',
                'posa ploia doulevoun tora',
                'posa karavia einai se leitourgia tora',
                'posa ploia einai se leitourgia tora',
                'posa karavia einai se ypiresia tora',
                'posa ploia einai se ypiresia tora',
                'posa karavia ekteloun dromologia tora',
                'posa ploia ekteloun dromologia tora',
                'poia karavia doulevoun tora',
                'poia ploia doulevoun tora',
                'poio karavi exei vardia tora',
                'poio ploio exei vardia tora',
                'ποια πλοια ειναι σε λειτουργια', 'ποια καραβια ειναι σε λειτουργια',
                'ποια πλοια δουλευουν', 'ποια καραβια δουλευουν',
                'ποσα πλοια ειναι σε λειτουργια', 'ποσα καραβια ειναι σε λειτουργια',
                'ποσα πλοια δουλευουν', 'ποσα καραβια δουλευουν',
                'ποια πλοια ειναι σε υπηρεσια', 'ποια καραβια ειναι σε υπηρεσια',
                'poia ploia einai se leitourgia', 'poia karavia einai se leitourgia',
                'poia ploia doulevoun', 'poia karavia doulevoun',
                'posa ploia einai se leitourgia', 'posa karavia einai se leitourgia',
                'posa ploia doulevoun', 'posa karavia doulevoun',
                'poia ploia einai se ypiresia', 'poia karavia einai se ypiresia'
            ],
            keywords: [
                'ποιο', 'ποια', 'ποσα', 'πλοιο', 'καραβι',
                'πλοια', 'καραβια', 'δουλευει', 'δουλευουν',
                'φορτωνει', 'υπηρεσια', 'βαρδια',
                'poio', 'poia', 'posa', 'ploio', 'karavi',
                'ploia', 'karavia', 'doulevei', 'doulevoun',
                'fortonei', 'ypiresia', 'vardia'
            ],
            requiredAny: [
                'ποιο', 'ποια', 'ποσα',
                'poio', 'poia', 'posa'
            ]
        },

        /* 20. shipsDetails */
        shipsDetails: {
            priority: 62,
            phrases: [
                'στοιχεια πλοιων', 'πληροφοριεσ για τα πλοια',
                'ποια πλοια εχει η γραμμη',
                'ποσα πλοια εχει η γραμμη',
                'ονοματα πλοιων', 'χαρακτηριστικα πλοιων',
                'fotografies ploion', 'stoixeia ploion',
                'plirofories gia ta ploia',
                'poia ploia exei i grammi',
                'posa ploia exei i grammi',
                'onomata ploion', 'xaraktiristika ploion'
            ],
            keywords: [
                'στοιχεια', 'χαρακτηριστικα', 'ονοματα',
                'φωτογραφιεσ', 'πλοια',
                'stoixeia', 'xaraktiristika', 'onomata',
                'fotografies', 'ploia'
            ],
            requiredAny: [
                'στοιχεια', 'χαρακτηριστικα', 'ονοματα',
                'φωτογραφιεσ',
                'stoixeia', 'xaraktiristika', 'onomata', 'fotografies'
            ]
        },

        /* 21. departurePoint */
        departurePoint: {
            priority: 93,
            phrases: [
                'απο ποια προβλητα φευγει το καραβι',
                'απο ποια προβλητα φευγει το πλοιο',
                'ποια προβλητα φευγει το καραβι',
                'ποια προβλητα φευγει το πλοιο',
                'σε ποια προβλητα ειναι το καραβι',
                'σε ποια προβλητα ειναι το πλοιο',
                'apo poia provlita feugei to karavi',
                'apo poia provlita feugei to ploio',
                'poia provlita feugei to karavi',
                'poia provlita feugei to ploio',
                'se poia provlita einai to karavi',
                'se poia provlita einai to ploio'
            ],
            keywords: [
                'προβλητα', 'φευγει', 'αναχωρει',
                'provlita', 'feugei', 'anaxorei'
            ],
            requiredAny: ['προβλητα', 'provlita']
        },

        /* 22. bridgeInfo */
        bridgeInfo: {
            priority: 118,
            phrases: [
                'γεφυρα ριου αντιρριου',
                'ποσο εχουν τα διοδια',
                'τιμη διοδιων στη γεφυρα',
                'στα διοδια της γεφυρας ποσο κανει',
                'συγκριση με τη γεφυρα',
                'συγκριση με τα διοδια',
                'περνανε οχηματα στη γεφυρα',
                'τιμες διοδιων', 'τιμη διοδιων', 'ποσο ειναι τα διοδια',
                'ποσο κοστιζουν τα διοδια', 'κοστος διοδιων', 'διοδια γεφυρας',
                'gefura riou antirriou',
                'poso exoun ta diodia',
                'timi diodion sti gefura',
                'sta diodia tis gefuras poso kanei',
                'sigrisi me ti gefura',
                'sigrisi me ta diodia',
                'pernane oximata sti gefura',
                'times diodion', 'timi diodion', 'posa einai ta diodia',
                'poso kostizoun ta diodia', 'kostos diodion', 'diodia gefuras'
            ],
            keywords: [
                'γεφυρα', 'διοδια',
                'gefura', 'gefyra', 'diodia', 'diodion'
            ],
            requiredAny: [
                'γεφυρα', 'διοδια',
                'gefura', 'gefyra', 'diodia', 'diodion'
            ]
        },

        /* 23. accessibleBoarding */
        accessibleBoarding: {
            priority: 121,
            phrases: [
                'υπαρχει προσβαση για αμεα', 'εχει προσβαση για αμεα',
                'μπορουν να επιβιβαστουν αμεα', 'πως επιβιβαζονται τα αμεα',
                'υπαρχει βοηθεια για αμεα', 'υπαρχει βοηθεια στην επιβιβαση για αμεα',
                'υπαρχει εξυπηρετηση για αμεα', 'βοηθαει το πληρωμα τα αμεα',
                'μπορω να μπω με αναπηρικο αμαξιδιο',
                'πως μπορω να μπω με αναπηρικο αμαξιδιο',
                'πως μπαινω με αναπηρικο αμαξιδιο',
                'μπαινει αναπηρικο αμαξιδιο στο καραβι',
                'χωραει αναπηρικο αμαξιδιο στο καραβι',
                'υπαρχει προσβαση με αναπηρικο αμαξιδιο',
                'χρειαζομαι βοηθεια για να μπω στο καραβι',
                'χρειαζομαι βοηθεια στην επιβιβαση',
                'ποιον ενημερωνω για βοηθεια στην επιβιβαση',
                'εχω κινητικο προβλημα μπορω να επιβιβαστω',
                'εχω μειωμενη κινητικοτητα μπορω να μπω στο καραβι',
                'εξυπηρετηση ατομων με μειωμενη κινητικοτητα',
                'αμεα στο καραβι', 'αμεα επιβιβαση', 'αναπηρικο αμαξιδιο στο ferry',
                'yparxei prosvasi gia amea', 'yparxi prosvasi se amea',
                'exei prosvasi gia amea', 'mporoun na epivivastoun amea',
                'pos epivivazontai ta amea', 'yparxei voitheia gia amea',
                'yparxei voitheia stin epivivasi gia amea',
                'yparxei eksypiretisi gia amea', 'voithaei to pliroma ta amea',
                'mporo na mpo me anapiriko amaxidio',
                'pos mporo na mpo me anapiriko amaxidio',
                'pos mpeno me anapiriko amaxidio', 'mpaino me anapiriko amaxidio',
                'mpainei anapiriko amaxidio sto karavi',
                'xoraei anapiriko amaxidio sto karavi',
                'yparxei prosvasi me anapiriko amaxidio',
                'xreiazomai voitheia gia na mpo sto karavi',
                'xreiazomai voitheia stin epivivasi',
                'poion enimerono gia voitheia stin epivivasi',
                'exo kinitiko provlima mporo na epivivasto',
                'exo meiomeni kinitikotita mporo na mpo sto karavi',
                'eksypiretisi atomon me meiomeni kinitikotita',
                'amea sto karavi', 'amea epivivasi', 'anapiriko amaxidio sto ferry'
            ],
            keywords: [
                'προσβαση', 'επιβιβαση', 'βοηθεια', 'εξυπηρετηση',
                'αναπηρικο', 'αμαξιδιο', 'κινητικοτητα',
                'prosvasi', 'epivivasi', 'voitheia', 'eksypiretisi',
                'anapiriko', 'amaxidio', 'kinitikotita'
            ],
            requiredAny: [
                'προσβαση', 'επιβιβαση', 'βοηθεια', 'εξυπηρετηση',
                'αναπηρικο', 'αμαξιδιο', 'κινητικοτητα',
                'prosvasi', 'epivivasi', 'voitheia', 'eksypiretisi',
                'anapiriko', 'amaxidio', 'kinitikotita'
            ]
        },

        /* 24. specialFareEligibility */
        specialFareEligibility: {
            priority: 119,
            phrases: [
                'η καρτα πολυτεκνου ισχυει', 'ισχυει η καρτα πολυτεκνου', 'ισχυει πολυτεκνικο',
                'ισχυει αμεα', 'δικαιολογητικα πολυτεκνων', 'δικαιολογητικα αμεα',
                'οι τριτεκνοι ειναι πολυτεκνοι', 'οι πολυτεκνοι εχουν εκπτωση', 'εχουν εκπτωση οι πολυτεκνοι',
                'τα αμεα εχουν εκπτωση', 'εχουν εκπτωση τα αμεα', 'υπαρχει εκπτωση για πολυτεκνους',
                'υπαρχει εκπτωση για αμεα', 'δικαιουνται εκπτωση οι πολυτεκνοι', 'δικαιουνται εκπτωση τα αμεα',
                'οι πολυτεκνοι δικαιουνται μειωμενο ναυλο', 'τα αμεα δικαιουνται μειωμενο ναυλο', 'μειωμενο ναυλο πολυτεκνων',
                'μειωμενο ναυλο αμεα', 'μειωμενη τιμη πολυτεκνων', 'μειωμενη τιμη αμεα',
                'τα αμεα ποσο πληρωνουν', 'ποσο πληρωνουν τα αμεα', 'ποσο πληρωνει αμεα',
                'ποσο πληρωνει το αμεα', 'τιμη αμεα', 'ποσο κοστιζει για αμεα',
                'οι πολυτεκνοι ποσο πληρωνουν', 'ποσο πληρωνουν οι πολυτεκνοι', 'ποσο πληρωνει ο πολυτεκνος',
                'ποσο πληρωνει το πολυτεκνικο', 'τιμη πολυτεκνου', 'τιμη πολυτεκνικου',
                'ποσο κοστιζει το πολυτεκνικο', 'τι δικαιολογητικα θελουν οι πολυτεκνοι', 'τι δικαιολογητικα χρειαζονται οι πολυτεκνοι',
                'τι δικαιολογητικα θελει το πολυτεκνικο', 'τι δικαιολογητικα θελουν τα αμεα', 'τι δικαιολογητικα χρειαζονται τα αμεα',
                'τι δικαιολογητικα θελει το αμεα', 'χρειαζεται καρτα πολυτεκνου', 'χρειαζεται δικαιολογητικο αμεα',
                'τι χρειαζεται για μειωμενο ναυλο', 'ποιες ειναι οι προυποθεσεις για μειωμενο ναυλο', 'ποιοι δικαιουνται μειωμενο ναυλο',
                'οι τριτεκνοι εχουν εκπτωση', 'εχουν εκπτωση οι τριτεκνοι', 'οι τριτεκνοι δικαιουνται εκπτωση',
                'οι τριτεκνοι δικαιουνται μειωμενο ναυλο', 'ισχυει εκπτωση για τριτεκνους', 'υπαρχει εκπτωση για τριτεκνους',
                'ισχυει τριτεκνικο', 'ισχυει η καρτα τριτεκνου', 'η καρτα τριτεκνου ισχυει',
                'δικαιολογητικα τριτεκνων', 'τι δικαιολογητικα θελουν οι τριτεκνοι', 'τι δικαιολογητικα χρειαζονται οι τριτεκνοι',
                'οι τριτεκνοι ποσο πληρωνουν', 'ποσο πληρωνουν οι τριτεκνοι', 'ποσο πληρωνει ο τριτεκνος',
                'ποσο πληρωνει το τριτεκνικο', 'τιμη τριτεκνου', 'τιμη τριτεκνικου',
                'μειωμενο ναυλο τριτεκνων', 'i karta politeknou isxuei', 'isxuei i karta politeknou',
                'isxuei politekniko', 'isxuei amea', 'dikaiologitika politeknon',
                'dikaiologitika amea', 'oi triteknoi einai politeknioi', 'oi politeknoi exoun ekptosi',
                'exoun ekptosi oi politeknoi', 'ta amea exoun ekptosi', 'exoun ekptosi ta amea',
                'yparxei ekptosi gia politeknous', 'yparxei ekptosi gia amea', 'dikaiountai ekptosi oi politeknoi',
                'dikaiountai ekptosi ta amea', 'oi politeknoi dikaiountai meiomeno naulo', 'ta amea dikaiountai meiomeno naulo',
                'meiomeno naulo politeknon', 'meiomeno naulo amea', 'meiomeni timi politeknon',
                'meiomeni timi amea', 'ta amea poso plironoun', 'poso plironoun ta amea',
                'poso plironei amea', 'poso plironei to amea', 'timi amea',
                'poso kostizei gia amea', 'oi politeknoi poso plironoun', 'poso plironoun oi politeknoi',
                'poso plironei o politeknos', 'poso plironei to politekniko', 'timi politeknou',
                'timi politeknikou', 'poso kostizei to politekniko', 'ti dikaiologitika theloun oi politeknoi',
                'ti dikaiologitika xreiazontai oi politeknoi', 'ti dikaiologitika thelei to politekniko', 'ti dikaiologitika theloun ta amea',
                'ti dikaiologitika xreiazontai ta amea', 'ti dikaiologitika thelei to amea', 'xreiazetai karta politeknou',
                'xreiazetai dikaiologitiko amea', 'ti xreiazetai gia meiomeno naulo', 'poies einai oi proypotheseis gia meiomeno naulo',
                'poioi dikaiountai meiomeno naulo', 'oi triteknoi exoun ekptosi', 'exoun ekptosi oi triteknoi',
                'oi triteknoi dikaiountai ekptosi', 'oi triteknoi dikaiountai meiomeno naulo', 'isxyei ekptosi gia triteknous',
                'yparxei ekptosi gia triteknous', 'isxyei tritekniko', 'isxyei i karta triteknou',
                'i karta triteknou isxyei', 'dikaiologitika triteknon', 'ti dikaiologitika theloun oi triteknoi',
                'ti dikaiologitika xreiazontai oi triteknoi', 'oi triteknoi poso plironoun', 'poso plironoun oi triteknoi',
                'poso plironei o triteknos', 'poso plironei to tritekniko', 'timi triteknou',
                'timi triteknikou', 'meiomeno naulo triteknon'
            ],
            keywords: [
                'πολυτεκν', 'αμεα', 'τριτεκν', 'μειωμεν', 'εκπτωση', 'δικαιολογητικ',
                'politekn', 'polytekn', 'amea', 'tritekn', 'meiomen', 'ekptosi', 'dikaiolog'
            ],
            requiredAny: [
                'πολυτεκν', 'αμεα', 'τριτεκν',
                'politekn', 'polytekn', 'amea', 'tritekn'
            ]
        },

        /* 24. petsOnBoard */
        petsOnBoard: {
            priority: 117,
            phrases: [
                'στο καραβι επιτρεπονται κατοικιδια',
                'επιτρεπεται σκυλος στο πλοιο',
                'μπορω να παρω το σκυλο μου',
                'μπορω να παρω τη γατα μου',
                'επιτρεπονται μελωδικα πτηνα',
                'μπορω να περασω με κατοικιδιο',
                'επιτρεπονται ζωα στο καραβι',
                'επιτρεπονται κοτες',
                'μπορω να μεταφερω προβατα',
                'επιτρεπονται κατσικες στο πλοιο',
                'μεταφερονται αλογα',
                'επιτρεπονται οικοσιτα ζωα',
                'επιτρεπονται παραγωγικα ζωα',
                'sto karavi epitrepontai katoikidia',
                'epitrepetai skylos sto ploio',
                'mporo na paro to skylo mou',
                'mporo na paro ti gata mou',
                'epitrepontai melodika ptina',
                'mporo na peraso me katoikidio',
                'epitrepontai zoa sto karavi',
                'epitrepontai kotes',
                'mporo na metafero provata',
                'epitrepontai katsikes sto ploio',
                'metaferontai aloga',
                'epitrepontai oikosita zoa',
                'epitrepontai paragogika zoa'
            ],
            keywords: [
                'κατοικιδ', 'σκυλ', 'γατ', 'μελωδικ',
                'οικοσιτ', 'παραγωγικ', 'κοτ',
                'προβατ', 'κατσικ', 'αλογ',
                'katoikid', 'skyl', 'gat', 'melodik',
                'oikosit', 'paragogik', 'kot',
                'provat', 'katsik', 'alog'
            ],
            requiredAny: [
                'κατοικιδ', 'σκυλ', 'γατ',
                'οικοσιτ', 'παραγωγικ',
                'katoikid', 'skyl', 'gat',
                'oikosit', 'paragogik'
            ]
        },
        /* 25. history */
        history: {
            priority: 50,
            phrases: [
                'ιστορια πορθμειου',
                'ιστορια γραμμησ',
                'ιστορια ριου αντιρριου',
                'ποτε ξεκινησε το πορθμειο',
                'history ferry',
                'istoria porthmeiou',
                'istoria grammis',
                'istoria riou antirriou',
                'pote ksekinise to porthmeio'
            ],
            keywords: [
                'ιστορια', 'παλια', 'ξεκινησε',
                'history', 'istoria', 'palia', 'ksekinise'
            ],
            requiredAny: [
                'ιστορια', 'history', 'istoria'
            ]
        },

        /* 26. photos */
        photos: {
            priority: 75,
            phrases: [
                'παλιες φωτογραφιες', 'ριο καποτε', 'φωτογραφιες αρχειου',
                'υπαρχουν φωτογραφιες', 'εχετε φωτογραφιες',
                'θελω να δω φωτογραφιες', 'που εχει φωτογραφιες',
                'φωτογραφικο αρχειο',
                'palies fotografies', 'rio kapote', 'fotografies arxeiou',
                'yparxoun fotografies', 'uparxoun fotografies',
                'exete fotografies', 'thelo na do fotografies',
                'pou exei fotografies', 'fotografiko arxeio'
            ],
            keywords: [
                'φωτογραφια', 'φωτογραφιεσ', 'αρχειο', 'καποτε',
                'fotografia', 'fotografies', 'arxeio', 'kapote'
            ],
            requiredAny: [
                'φωτογραφια', 'φωτογραφιεσ', 'fotografia', 'fotografies'
            ]
        },

        /* 27. info */
        info: {
            priority: 45,
            phrases: [
                'πληροφοριεσ για το πορθμειο',
                'πληροφοριεσ για τη γραμμη',
                'τι ειναι το πορθμειο',
                'rio antirrio ferries',
                'plirofories gia to porthmeio',
                'plirofories gia ti grammi',
                'ti einai to porthmeio'
            ],
            keywords: [
                'πληροφοριεσ', 'πορθμειο', 'γραμμη',
                'ferries', 'plirofories', 'porthmeio', 'grammi'
            ],
            requiredAny: [
                'πληροφοριεσ', 'πορθμειο',
                'plirofories', 'porthmeio'
            ]
        },

        /* 28. capabilities */
        capabilities: {
            priority: 60,
            phrases: [
                'τι ξερεισ', 'ποσα ξερεισ',
                'τι μπορεισ να κανεισ',
                'τι μπορω να σε ρωτησω',
                'τι απαντασ',
                'βοηθεια',
                'ti ksereis', 'posa xereis', 'posa ksereis',
                'ti mporeis na kaneis',
                'ti mporo na se rotiso',
                'ti apantas',
                'voitheia'
            ],
            keywords: [
                'ξερεισ', 'μπορεισ', 'ρωτησω',
                'απαντασ', 'βοηθεια',
                'ksereis', 'mporeis', 'rotiso',
                'apantas', 'voitheia'
            ],
            requiredAny: [
                'ξερεισ', 'μπορεισ', 'βοηθεια',
                'ksereis', 'mporeis', 'voitheia'
            ]
        }
    };

    const META = {
        version: '1.0.0',
        name: 'Rio Ai Assistant',
        project: 'Rio-Antirrio Ferries',
        language: 'el',
        greeklish: true,
        localOnly: true
    };

    /*
     * Public read-only catalogue.
     * The engine reads this object but does not modify it.
     */
    global.RioAIKnowledge = Object.freeze({
        meta: Object.freeze(META),
        intents: Object.freeze(INTENTS)
    });

})(window);
