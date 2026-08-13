(function () {
    'use strict';

    const CONFIG = {
        responseDelayMin: 180,
        responseDelayMax: 360,
        gpsPollInterval: 1500,
        gpsMaxWaitMs: 45000,
        liveAppUrl: 'https://rio-antirrio.blogspot.com/p/rio-antirrio-live_4.html',
        links: {
            prices: 'https://rio-antirrio.blogspot.com/2014/09/price.html',
            forecast: 'https://rio-antirrio.blogspot.com/2014/09/weather.html',
            traffic: 'https://rio-antirrio.blogspot.com/2018/06/real-time-traffic.html',
            history: 'https://rio-antirrio.blogspot.com/2014/09/historical-data.html',
            photos: 'https://rio-antirrio.blogspot.com/2013/04/old-photos.html',
            videos: 'https://rio-antirrio.blogspot.com/2014/09/video-youtube.html',
            schedule: 'https://rio-antirrio.blogspot.com/2018/08/dromologia.html',
            liveDepartures: 'https://rio-antirrio.blogspot.com/2026/04/rio-antirrio-live_01990658903.html',
            facebook: 'https://www.facebook.com/share/1J6uiUt4cd/',
            mapsRio: 'https://maps.app.goo.gl/e5rfTR4NqubWNJFYA?g_st=ac',
            mapsAnt: 'https://maps.app.goo.gl/M6w61ZGt881daB7VA',
            mapsPage: 'https://rio-antirrio.blogspot.com/2014/09/xartes-chart-maps.html',
            meteoRioLive: 'https://penteli.meteo.gr/stations/rio/',
            shipsDetails: 'https://rio-antirrio.blogspot.com/2014/09/ships-details.html',
            assistantAbout: 'https://rio-antirrio.blogspot.com/p/rio-ai-assistant.html'
        }
    };

    const CHAT_MEMORY_KEY = 'rioAIChatMemoryV1';
    const CHAT_MEMORY_TTL_MS = 24 * 60 * 60 * 1000;
    const CHAT_MEMORY_MAX_PAIRS = 5;

    const state = {
        lastIntent: null,
        lastPort: null,
        appDoc: null,
        rawHtml: '',
        loadedAt: 0
    };

    const CLOSE_AWARE_INTENTS = new Set([
        'status', 'statusToday', 'futureScheduleInfo', 'continuousOperation',
        'next', 'next3', 'nextHour', 'schedule', 'frequency',
        'vesselPosition', 'departurePoint', 'gps', 'distanceGps', 'liveDepartures'
    ]);

    const CLOSE_BLOCKED_ACTIONS = new Set([
        'next', 'next3', 'nextHour', 'liveDepartures'
    ]);

    /* =========================================================
       01. CHAT UI CONTROLLER
       ========================================================= */
    function updateStatusBadge() {
        const badge = document.getElementById('ai-line-status');
        if (!badge) return;
        const closed = isFerryClosed();
        badge.textContent = closed
            ? 'Πορθμείο: ΚΛΕΙΣΤΟ'
            : 'Πορθμείο: ΑΝΟΙΚΤΟ';
        badge.classList.toggle('is-closed', closed);
    }

    function setChatOpen(shouldOpen) {
        const win = document.getElementById('ai-chat-window');
        const input = document.getElementById('aiInput');
        if (!win) return;
        win.style.display = shouldOpen ? 'flex' : 'none';

        if (shouldOpen) {
            updateStatusBadge();

            const body = document.getElementById('aiChatBody');
            if (body) {
                requestAnimationFrame(function () {
                    body.scrollTop = body.scrollHeight;
                    setTimeout(function () {
                        body.scrollTop = body.scrollHeight;
                    }, 60);
                });
            }
        }

        if (!shouldOpen && input) input.blur();
    }

    function toggleChatWindow() {
        const win = document.getElementById('ai-chat-window');
        if (!win) return;
        setChatOpen(getComputedStyle(win).display !== 'flex');
    }


    function sleep(ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }

    function getThinkingDelay() {
        const min = Number(CONFIG.responseDelayMin) || 500;
        const max = Number(CONFIG.responseDelayMax) || min;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function isInsideLiveApp() {
        return Boolean(
            document.getElementById('main-schedule-app') ||
            document.getElementById('gps-status-bar') ||
            /\/p\/rio-antirrio-live_4\.html/i.test(window.location.pathname)
        );
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    /* =========================================================
       02. TEXT NORMALIZATION AND INTENT ENGINE
       ========================================================= */
    function stripAccents(text) {
        return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function greeklishToGreek(text) {
        const pairs = [
            ['th', 'θ'], ['ch', 'χ'], ['ps', 'ψ'], ['ks', 'ξ'],
            ['ou', 'ου'], ['ai', 'αι'], ['ei', 'ει'], ['oi', 'οι'],
            ['mp', 'μπ'], ['nt', 'ντ'], ['gk', 'γκ'], ['ts', 'τσ'], ['tz', 'τζ']
        ];
        let result = text;
        pairs.forEach(function (pair) {
            result = result.replace(new RegExp(pair[0], 'g'), pair[1]);
        });
        const map = {
            a: 'α', b: 'β', v: 'β', g: 'γ', d: 'δ', e: 'ε', z: 'ζ', h: 'η',
            i: 'ι', j: 'τζ', k: 'κ', l: 'λ', m: 'μ', n: 'ν', x: 'ξ', o: 'ο',
            p: 'π', r: 'ρ', s: 'σ', t: 'τ', u: 'υ', f: 'φ', w: 'ω', y: 'υ', q: 'κ'
        };
        return Array.from(result).map(function (char) { return map[char] || char; }).join('');
    }

    const WORD_ALIASES = {
        'επομενο': 'επομενο',
        'επομενα': 'επομενα',
        'επομενι': 'επομενη',
        'δρομολογια': 'δρομολογια',
        'δρομολογιο': 'δρομολογιο',
        'προγραμμα': 'προγραμμα',
        'ωρεσ': 'ωρεσ',
        'θεσι': 'θεση',
        'θεσει': 'θεση',
        'πλιο': 'πλοιο',
        'πλοιον': 'πλοιων',
        'πλοια': 'πλοια',
        'χαρτισ': 'χαρτησ',
        'χαρτι': 'χαρτη',
        'ανατολικα': 'ανατολικα',
        'δυτικα': 'δυτικα',
        'αποστασι': 'αποσταση',
        'απεχο': 'απεχω',
        'φτανο': 'φτανω',
        'αφιξι': 'αφιξη',
        'διαδρομι': 'διαδρομη',
        'προορισμοσ': 'προορισμοσ',
        'ανιχτι': 'ανοιχτη',
        'ανοιχτι': 'ανοιχτη',
        'κλιστι': 'κλειστη',
        'κλειστι': 'κλειστη',
        'λιτουργει': 'λειτουργει',
        'καταστασι': 'κατασταση',
        'τιμι': 'τιμη',
        'τιμεσ': 'τιμεσ',
        'κοστοσ': 'κοστοσ',
        'κοστιζει': 'κοστιζει',
        'ισιτιριο': 'εισιτηριο',
        'εισιτιριο': 'εισιτηριο',
        'ναυλοσ': 'ναυλοσ',
        'κεροσ': 'καιροσ',
        'καιροσ': 'καιροσ',
        'ανεμοσ': 'ανεμοσ',
        'θερμοκρασια': 'θερμοκρασια',
        'προγνοσι': 'προγνωση',
        'αυριο': 'αυριο',
        'τιλεφονο': 'τηλεφωνο',
        'λιμεναρχιο': 'λιμεναρχειο',
        'επικινονια': 'επικοινωνια',
        'ιστορια': 'ιστορια',
        'φoτογραφια': 'φωτογραφια',
        'φοτογραφια': 'φωτογραφια',
        'παλιεσ': 'παλιεσ',
        'αβριο': 'αυριο',
        'αφριο': 'αυριο',
        'καραβι': 'πλοιο',
        'καραβια': 'πλοια',
        'καραβιων': 'πλοιων',
        'φεβγει': 'φευγει',
        'φευγι': 'φευγει',
        'αναχωριση': 'αναχωρηση',
        'αναχορηση': 'αναχωρηση',
        'δρομολογιον': 'δρομολογιων',
        'ωραριο': 'ωραρια',
        'λιμενικο': 'λιμεναρχειο',
        'τιλεφονo': 'τηλεφωνο',
        'μποφορια': 'μποφορ',
        'μποφορ': 'μποφορ',
        'mpofor': 'μποφορ',
        'mpofort': 'μποφορ',
        'bofor': 'μποφορ',
        'bofort': 'μποφορ',
        'bofr': 'μποφορ',
        'beaufort': 'μποφορ',
        'beafort': 'μποφορ',
        'beufort': 'μποφορ',
        'bf': 'μποφορ',
        'wind': 'ανεμοσ',
        'ανεμουσ': 'ανεμοσ',
        'θερμοκρασιασ': 'θερμοκρασια',
        'φτασο': 'φτασω',
        'φτασει': 'φτανω',
        'απεχι': 'απεχω',
        'αποστασει': 'αποσταση',
        'εγκαταστι': 'εγκατασταση',
        'οθονι': 'οθονη',
        'εκτελουντε': 'εκτελουνται',
        'εκτελουνται': 'εκτελουνται',
        'γραμμι': 'γραμμη',
        'γραμμη': 'γραμμη',
        'ανοιχτο': 'ανοιχτο',
        'κλειστο': 'κλειστο',
        'που': 'που',
        'πωσ': 'πως',
        'τι': 'τι',
        'θα': 'θα',
        'εχει': 'εχει',
        'κανει': 'κανει',
        'προσ': 'προς',
        'πανε': 'πανε',
        'βρισκονται': 'βρισκονται',
        'γινονται': 'γινονται',
        'προβλιτα': 'προβλητα',
        'προβλητα': 'προβλητα',
        'πλοηγισι': 'πλοηγηση',
        'πλοηγηση': 'πλοηγηση',
        'αναχωρισεισ': 'αναχωρησεις',
        'αναχωρησεισ': 'αναχωρησεις',
        'φεισμπουκ': 'facebook',
        'φασεμπουκ': 'facebook',
        'σημερα': 'σημερα',
        'τωρα': 'τωρα',
        'pso': 'poso',
        'ψο': 'ποσο',
        'antiriro': 'antirrio',
        'antirio': 'antirrio',
        'αντιριρο': 'αντιρριο',
        'αντιριο': 'αντιρριο',
        'dromolgia': 'dromologia',
        'δρομολγια': 'δρομολογια',
        'karabi': 'karavi',
        'καραμπι': 'καραβι',
        'prolaveno': 'prolavaino',
        'provaleno': 'prolavaino',
        'proivlita': 'provlita',
        'plrovlita': 'provlita',
        'prolvita': 'provlita',
        'plovlita': 'provlita',
        'provlhta': 'provlita',
        'problita': 'provlita',
        'tilefona': 'τηλεφωνα',
        'tilefono': 'τηλεφωνο',
        'apoplou': 'apoplous',
        'frano': 'ftano'
    };

    function normalizeWord(word) {
        let normalizedWord = /[a-z]/.test(word)
            ? greeklishToGreek(word)
            : word;

        normalizedWord = normalizedWord.replace(/ς/g, 'σ');

        return WORD_ALIASES[normalizedWord] || normalizedWord;
    }

    function normalizeText(value) {
        let text = stripAccents(String(value || '').toLowerCase().trim());

        text = text
            .replace(/ς/g, 'σ')
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return text
            .split(' ')
            .filter(Boolean)
            .map(normalizeWord)
            .join(' ');
    }

    function tokens(text) {
        return new Set(normalizeText(text).split(' ').filter(Boolean));
    }

    function levenshtein(a, b) {
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        const matrix = Array.from({ length: b.length + 1 }, function () {
            return new Array(a.length + 1).fill(0);
        });
        for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                const cost = b[i - 1] === a[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
            }
        }
        return matrix[b.length][a.length];
    }

    function fuzzyHas(wordSet, keyword) {
        const k = normalizeText(keyword);
        if (wordSet.has(k)) return true;
        if (k.length < 5) return false;
        for (const word of wordSet) {
            if (word.length >= 5 && levenshtein(word, k) <= 1) return true;
        }
        return false;
    }

    /* =========================================================
       03. KNOWLEDGE / INTENT CATALOGUE — FINAL ORGANIZATION
       =========================================================
       01 next3              02 schedule            03 distanceGps
       04 vesselPosition     05 gps                 06 next
       07 status             08 prices              09 forecast
       10 weather            11 install             12 navigation
       13 liveApp            14 shipsDetails        15 liveDepartures
       16 facebook           17 social              18 assistantCapabilities
       19 assistantAbout     20 passengerFare       21 tripDuration
       22 payment            23 contacts            24 history
       25 photos

       ΣΗΜΑΝΤΙΚΟ:
       - Η αρίθμηση είναι μόνο για ανάγνωση/συντήρηση.
       - Τα λειτουργικά priority values παραμένουν όπως έχουν δοκιμαστεί.
       - Δεν αλλάζει η σειρά επίλυσης των operational intents.
       ========================================================= */

    const INTENTS = (
        window.RioAIKnowledge &&
        window.RioAIKnowledge.intents
    );

    if (!INTENTS) {
        throw new Error('Rio-Antirrio AI Assistant: knowledge catalogue is not loaded.');
    }

    function detectOriginPort(text) {
        const raw = normalizeRawQuery(text);
        const origin = raw.match(/(?:^|\s)(?:απο|apo)\s+(?:το\s+)?(ριο|ριου|rio|riou|αντιρριο|αντιρριου|αντιριο|antirrio|antirriou|antirio|antiriou|antiriro)(?:\s|$)/);
        if (!origin) return null;
        return /^(?:ριο|ριου|rio|riou)$/.test(origin[1]) ? 'rio' : 'ant';
    }

    function detectPort(text) {
        const originPort = detectOriginPort(text);
        if (originPort) return originPort;

        const raw = normalizeRawQuery(text);
        if (/\b(?:αντιρριο|αντιρριου|αντιριο|antirrio|antirriou|antirio|antiriou|antiriro)\b/.test(raw)) return 'ant';
        if (/\b(?:ριο|ριου|rio|riou)\b/.test(raw)) return 'rio';

        const n = normalizeText(text);
        if (n.includes('αντιρριο') || n.includes('αντιρριου') || n.includes('αντιριο') || n.includes('αντιριρο')) return 'ant';
        if (/(^|\s)(?:ριο|ριου)($|\s)/.test(n)) return 'rio';
        return null;
    }

    function normalizeRawQuery(value) {
        return stripAccents(String(value || '').toLowerCase())
            .replace(/ς/g, 'σ')
            .replace(/[^a-z0-9\u0370-\u03ff\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /*
     * Πρώτος έλεγχος στο αρχικό κείμενο, χωρίς Greeklish μετατροπή.
     * Έτσι δεν επηρεάζονται οι βασικές ερωτήσεις από λάθος μεταγραφή.
     */
    function detectRawIntent(text) {
        const q = normalizeRawQuery(text);

        const rules = [
            {
                name: 'passengerFare',
                patterns: [
                    /(?:οι\s+)?επιβατες\s+πληρωνουν/,
                    /πληρωνουν\s+(?:οι\s+)?επιβατες/,
                    /ειναι\s+δωρεαν\s+(?:οι\s+)?επιβατες/,
                    /oi\s+epivates\s+plironoun/,
                    /plironoun\s+oi\s+epivates/
                ]
            },
            {
                name: 'tripDuration',
                patterns: [
                    /ποσο\s+χρονο\s+κανει\s+να\s+περασει\s+απεναντι/,
                    /ποσο\s+κανει\s+να\s+περασει\s+(?:το\s+)?(?:πλοιο|καραβι)\s+απεναντι/,
                    /ποσο\s+κανει\s+(?:το\s+)?(?:πλοιο|καραβι)\s+να\s+περασει\s+απεναντι/,
                    /ποσο\s+διαρκει\s+η\s+διαδρομη/,
                    /ποση\s+ειναι\s+η\s+διαρκεια\s+της\s+διαδρομης/,
                    /χρονος\s+(?:διελευσης|διαδρομης)(?:\s+ριο\s+αντιρριο)?/,
                    /ποσο\s+χρονο\s+χρειαζεται\s+το\s+(?:πλοιο|καραβι)\s+για\s+(?:τη|την)\s+διαδρομη/,
                    /ποσο\s+χρονο\s+χρειαζεται\s+(?:το\s+)?(?:πλοιο|καραβι)\s+να\s+περασει\s+απεναντι/,
                    /poso\s+xrono\s+kanei\s+na\s+perasei\s+apenanti/,
                    /poso\s+kanei\s+na\s+perasei\s+(?:to\s+)?(?:ploio|karavi)\s+apenanti/,
                    /poso\s+kanei\s+(?:to\s+)?(?:ploio|karavi)\s+na\s+perasei\s+apenanti/,
                    /poso\s+xrono\s+(?:xreiazetai|xreiazeze)\s+(?:to\s+)?(?:ploio|karavi)\s+na\s+perasei\s+apenanti/,
                    /poso\s+diarkei\s+i\s+diadromi/,
                    /posi\s+einai\s+i\s+diarkeia\s+tis\s+diadromis/,
                    /xronos\s+(?:dieleusis|dielefsis|diadromis)(?:\s+rio\s+antirrio)?/,
                    /poso\s+xrono\s+xreiazetai\s+to\s+(?:ploio|karavi)\s+gia\s+ti\s+diadromi/
                ]
            },
            {
                name: 'payment',
                patterns: [
                    /τροπος\s+πληρωμης/,
                    /πως\s+πληρωνω/,
                    /που\s+πληρωνω/,
                    /δεχεται\s+pos/,
                    /μετρητα\s+(?:η|ή)\s+καρτα/,
                    /χρειαζεται\s+κρατηση/,
                    /tropos\s+pliromis/,
                    /pos\s+plirono/,
                    /pou\s+plirono/,
                    /dexetai\s+pos/,
                    /xreiazetai\s+kratisi/
                ]
            },
            {
                name: 'liveApp',
                patterns: [
                    /^(?:live|live app|rio antirrio live|rio antirrio live app)$/,
                    /^(?:live εφαρμογη|εφαρμογη live|live efarmogi|efarmogi live)$/
                ]
            },
            {
                name: 'shipsDetails',
                patterns: [
                    /στοιχεια\s+πλοιων/,
                    /ποσα\s+πλοια\s+(?:ειναι|δουλευουν)(?:\s+(?:στη|στην)\s+γραμμη)?/,
                    /ποια\s+πλοια\s+(?:ειναι|δουλευουν)(?:\s+(?:στη|στην)\s+γραμμη)?/,
                    /ονοματα\s+πλοιων/,
                    /πληροφοριες\s+για\s+τα\s+πλοια/,
                    /stoixeia\s+ploion/,
                    /posa\s+ploia\s+(?:einai|doulevoun|douleuoun)(?:\s+sti\s+grammi)?/,
                    /poia\s+ploia\s+(?:einai|doulevoun|douleuoun)(?:\s+sti\s+grammi)?/,
                    /onomata\s+ploion/,
                    /plirofories\s+gia\s+ta\s+ploia/
                ]
            },
            {
                name: 'social',
                patterns: [
                    /^(?:γεια|γεια σου|γεια σας|χαιρετε|καλημερα|καλησπερα|καληνυχτα|καλο βραδυ|geia|geia sou|geia sas|kalimera|kalispera|kalinixta|kalinuxta|kalo vradi|hello|hi)$/,
                    /^(?:ευχαριστω|ευχαριστω πολυ|σε ευχαριστω|να εισαι καλα|να ειστε καλα|euxaristo|euxaristo poli|na eisai kala|na eiste kala|thanks|thank you)$/,
                    /^(?:μπορω να ρωτησω|μπορω να ρωτησω κατι|να ρωτησω|να ρωτησω κατι|θελω να ρωτησω κατι|mporo na rotiso|mporo na rotiso kati|na rotiso|na rotiso kati|thelo na rotiso kati)$/,
                    /^(?:τελεια|μπραβο|ενταξει|καταλαβα|σωστα|teleia|bravo|entaxi|katalava|sosta|ok)$/,
                    /^(?:αντιο|τα λεμε|καλη συνεχεια|καλο ταξιδι|antio|ta leme|kali sinexeia|kalo taxidi|bye|goodbye)$/,
                    /^(?:παρακαλω|parakalo)$/
                ]
            },
            {
                name: 'assistantCapabilities',
                patterns: [
                    /^(?:βοηθεια|help|voitheia)$/,
                    /^(?:τι|ποσα)\s+(?:ξερεις|γνωριζεις)$/,
                    /^(?:ti|posa)\s+(?:xereis|ksereis|gnorizeis)$/,
                    /^(?:τι|ti)\s+(?:μπορεις|mporeis)\s+(?:να\s+|na\s+)?(?:κανεις|kaneis|απαντησεις|apantiseis)$/,
                    /^(?:τι|ti)\s+(?:μπορω|mporo)\s+(?:να\s+|na\s+)?(?:ρωτησω|rotiso)$/,
                    /^(?:τι|ti)\s+(?:ερωτησεις|erotiseis)\s+(?:μπορω|mporo)\s+(?:να\s+|na\s+)?(?:κανω|kano)$/,
                    /^(?:σε\s+τι|se\s+ti)\s+(?:μπορεις|mporeis)\s+(?:να\s+|na\s+)?(?:απαντησεις|apantiseis)$/,
                    /^(?:τι|ti)\s+(?:πληροφοριες|plirofories)\s+(?:παρεχεις|parexeis|δινεις|dineis)$/,
                    /^(?:με\s+τι|me\s+ti)\s+(?:μπορεις|mporeis)\s+(?:να\s+|na\s+)?(?:με\s+|me\s+)?(?:βοηθησεις|voithiseis)$/,
                    /^(?:τι|ti)\s+(?:μπορω|mporo)\s+(?:να\s+|na\s+)?(?:σε\s+|se\s+)(?:ρωτησω|rotiso)$/,
                    /^(?:ποιες|poies)\s+(?:πληροφοριες|plirofories)\s+(?:εχεις|exeis)$/,
                    /^(?:τι|ti)\s+(?:πληροφοριες|plirofories)\s+(?:ξερεις|xereis|ksereis)$/,
                    /^(?:τι|ti)\s+(?:υπηρεσιες|ipiresies)\s+(?:παρεχεις|parexeis)$/,
                    /^(?:τι|ti)\s+(?:δυνατοτητες|dinatotites)\s+(?:εχεις|exeis)$/,
                    /^(?:τι|ti)\s+(?:μπορει|mporei)\s+(?:να\s+|na\s+)?(?:κανει|kanei)\s+(?:(?:ο|o)\s+)?(?:assistant|βοηθος|voithos)$/,
                    /^(?:τι|ti)\s+(?:ερωτησεις|erotiseis)\s+(?:απαντας|apantas)$/,
                    /^(?:για\s+τι\s+πραγματα|gia\s+ti\s+pragmata)\s+(?:μπορω|mporo)\s+(?:να\s+|na\s+)?(?:σε\s+|se\s+)(?:ρωτησω|rotiso)$/,
                    /^(?:τι|ti)\s+(?:ξερεις|ξερεισ|xereis|ksereis|γνωριζεις|γνωριζεισ|gnorizeis)\s+(?:για|gia)\s+(?:(?:τη|την|ti|tin)\s+)?(?:γραμμη|grammi)$/,
                    /^(?:τι|ti)\s+(?:ξερεις|ξερεισ|xereis|ksereis|γνωριζεις|γνωριζεισ|gnorizeis)\s+(?:για|gia)\s+(?:το|to)\s+(?:ριο\s+αντιρριο|rio\s+antirrio)$/
                ]
            },
            {
                name: 'assistantAbout',
                patterns: [
                    /^(?:ποιος|ποια|ποιο|τι|poios|poia|poio|ti)\s+(?:εισαι|eisai)$/,
                    /^(?:τι\s+ειναι|ti\s+einai)\s+(?:(?:ο|η|το|o|i|to)\s+)?(?:rio\s+antirrio\s+)?(?:ai\s+assistant|assistant|ferries|live|app|εφαρμογη|υπηρεσια)$/,
                    /^(?:σε\s+ποιον\s+ανηκει|se\s+poion\s+anikei|ποιος\s+ειναι\s+πισω\s+απο|poios\s+einai\s+piso\s+apo|ποιος\s+εφτιαξε|poios\s+eftiaxe|ποιος\s+δημιουργησε|poios\s+dimiourgise)\s+(?:το\s+|τον\s+|τη\s+|την\s+)?(?:rio\s+antirrio\s+)?(?:ferries|live|assistant|app|εφαρμογη|βοηθο|βοηθος)$/,
                    /^(?:ποιος|poios)\s+(?:σε\s+|se\s+)(?:εφτιαξε|eftiaxe|δημιουργησε|dimiourgise|διαχειριζεται|diaxeirizetai)$/,
                    /^(?:ποιος|poios)\s+(?:ειναι\s+|einai\s+)(?:(?:ο|o)\s+)?(?:δημιουργος|dimiourgos)(?:\s+(?:σου|sou))?$/,
                    /^(?:ποιος|poios)\s+(?:διαχειριζεται|diaxeirizetai)\s+(?:τη\s+|την\s+|ti\s+|tin\s+)?(?:σελιδα|selida|εφαρμογη|efarmogi|assistant)$/,
                    /^(?:σε\s+ποιον|se\s+poion)\s+(?:ανηκει|anikei)\s+(?:η\s+|ο\s+|i\s+|o\s+)?(?:σελιδα|selida|εφαρμογη|efarmogi|assistant)$/,
                    /^(?:ειναι|einai)\s+(?:ιδιωτικη|idiotiki)\s+(?:υπηρεσια|ipiresia|πρωτοβουλια|protovoulia)$/,
                    /^(?:ειναι|einai)\s+(?:επισημη|episimi)\s+(?:υπηρεσια|ipiresia)$/,
                    /^(?:ανηκει|anikei)\s+(?:στο|στις|sto|stis)\s+(?:λιμενικο|limeniko|λιμεναρχειο|limenarxeio|πλοιοκτητριες\s+εταιρειες|ploioktitries\s+etaireies)$/,
                    /^(?:ειναι|einai)\s+(?:του|tou)\s+(?:κρατους|kratous)$/
                ]
            },
            {
                name: 'navigation',
                patterns: [
                    /^(?:χαρτες|χαρτη|xartes|xarti|maps)$/,
                    /(?:χαρτες|xartes)\s+(?:ριο|αντιρριο|rio|antirrio)/,
                    /(?:πως|pos)\s+(?:παω|φτανω|pao|ftano)\s+(?:στο|στον|sto)\s+(?:ριο|αντιρριο|rio|antirrio)/,
                    /(?:πλοηγηση|ploigisi)\s+(?:προς|pros)/
                ]
            },
            {
                name: 'vesselPosition',
                patterns: [
                    /σε\s+ποια\s+προβλητα\s+δουλευουν\s+τα\s+(?:πλοια|καραβια)/,
                    /se\s+poia\s+provlita\s+doulevoun\s+ta\s+(?:ploia|karavia)/,
                    /^(?:που\s+δουλευουν|pou\s+doulevoun)$/,
                    /^(?:ποιες\s+προβλητες\s+δουλευουν|poies\s+provlites\s+doulevoun)$/,
                    /^(?:απο\s+ποιες\s+προβλητες\s+φευγουν\s+τα\s+(?:καραβια|πλοια)|apo\s+poies\s+provlites\s+feugoun\s+ta\s+(?:karavia|ploia))$/,
                    /^(?:τα\s+(?:καραβια|πλοια)\s+δουλευουν\s+ανατολικα\s+(?:η|ή)\s+δυτικα|ta\s+(?:karavia|ploia)\s+doulevoun\s+anatolika\s+i\s+(?:dutika|ditika))$/,
                    /που\s+(?:ειναι|βρισκονται|δουλευουν)\s+τα\s+(?:πλοια|καραβια)/,
                    /(?:σε\s+)?ποια\s+προβλητα\s+(?:δουλευουν|εργαζονται|ειναι)/,
                    /(?:se\s+)?poia\s+provlita\s+(?:doulevoun|ergazontai|einai)/,
                    /pou\s+(?:einai|vriskontai|douleuoun|doulevoun)\s+ta\s+(?:ploia|karavia)/,
                    /(?:πλοια|καραβια).*ανατολικα.*δυτικα/,
                    /(?:ploia|karavia).*anatolika.*(?:ditika|dytika)/,
                    /ανατολικα\s+(?:η|ή)\s+δυτικα/,
                    /anatolika\s+(?:i|h)\s+(?:ditika|dytika)/,
                    /(?:θεση|κινηση)\s+(?:πλοιων|καραβιων)/,
                    /(?:thesi|kinisi)\s+(?:ploion|karavion)/,
                    /(?:live|ζωντανος)\s+χαρτης\s+πλοιων/,
                    /(?:live|zontanos)\s+xartis\s+ploion/
                ]
            },
            {
                name: 'forecast',
                patterns: [
                    /προγνωση\s+καιρου/,
                    /prognosi\s+kairou/,
                    /τι\s+καιρο\s+θα\s+(?:εχει|κανει)\s+αυριο/,
                    /ti\s+kairo\s+tha\s+(?:exei|kanei)\s+(?:aurio|avrio)/,
                    /καιρος?\s+αυριο/,
                    /kairos?\s+(?:aurio|avrio)/,
                    /τι\s+ανεμο\s+θα\s+εχει\s+αυριο/,
                    /ti\s+anemo\s+tha\s+exei\s+(?:aurio|avrio)/,
                    /θα\s+(?:εχει|βγαλει)\s+απαγορευτικο/,
                    /tha\s+(?:exei|vgalei)\s+apagoreutiko/,
                    /απαγορευτικο\s+αυριο/,
                    /apagoreutiko\s+(?:aurio|avrio)/,
                    /windfinder|meteo/
                ]
            },
            {
                name: 'navigation',
                patterns: [
                    /πως\s+(?:φτανω|παω)\s+στο\s+(?:ριο|αντιρριο)/,
                    /pos\s+(?:ftano|pao)\s+sto\s+(?:rio|antirrio|antirio|antiriro)/,
                    /πλοηγηση\s+προς\s+(?:το\s+)?(?:ριο|αντιρριο)/,
                    /ploigisi\s+pros\s+(?:to\s+)?(?:rio|antirrio|antirio|antiriro)/,
                    /πλοηγηση\s+προς\s+την\s+προβλητα/,
                    /ploigisi\s+pros\s+tin\s+provlita/,
                    /διαδρομη\s+για\s+(?:το\s+)?(?:ριο|αντιρριο)/,
                    /diadromi\s+gia\s+(?:to\s+)?(?:rio|antirrio|antirio|antiriro)/,
                    /google\s+maps\s+(?:ριο|αντιρριο|rio|antirrio|antirio)/
                ]
            },
            {
                name: 'distanceGps',
                patterns: [
                    /^(?:gps|αποσταση gps|apostasi gps)$/,
                    /^(?:που ειμαι|pou eimai)$/,
                    /ποσο\s+απεχω/,
                    /poso\s+apexo/,
                    /ποση\s+αποσταση/,
                    /posi\s+apostasi/,
                    /ποτε\s+φτανω/,
                    /pote\s+ftano/,
                    /σε\s+ποση\s+ωρα\s+φτανω/,
                    /se\s+posi\s+ora\s+ftano/,
                    /ποσο\s+(?:χρονο\s+)?θελω\s+για\s+να\s+φτασω/,
                    /poso\s+(?:xrono\s+)?thelo\s+gia\s+na\s+ftaso/,
                    /αποσταση\s+gps|apostasi\s+gps/,
                    /χρονος\s+αφιξης|xronos\s+afixis/
                ]
            },
            {
                name: 'status',
                patterns: [
                    /εκτελουνται\s+δρομολογια/,
                    /εκτελουντε\s+δρομολογια/,
                    /^(?:εχει|υπαρχουν)\s+δρομολογια$/,
                    /^(?:exei|yparxoun)\s+dromologia$/,
                    /ektelountai\s+dromologia/,
                    /ektelounte\s+dromologia/,
                    /γινονται\s+δρομολογια|ginontai\s+dromologia/,
                    /δουλευουν\s+τα\s+(?:πλοια|καραβια)(?!.*(?:ανατολικα|δυτικα))/,
                    /(?:douleuoun|doulevoun)\s+ta\s+(?:ploia|karavia)(?!.*(?:anatolika|ditika|dytika))/,
                    /η\s+γραμμη\s+ειναι\s+(?:ανοιχτη|ανοικτη|κλειστη)/,
                    /ειναι\s+(?:ανοιχτη|ανοικτη|κλειστη)\s+η\s+γραμμη/,
                    /(?:i|h)\s+grammi\s+einai\s+(?:anoixti|anoikti|anoichti|klisti|kleisti)/,
                    /einai\s+(?:anoixti|anoikti|anoichti|klisti|kleisti)\s+(?:i|h)\s+grammi/,
                    /ειναι\s+(?:ανοιχτο|κλειστο)\s+το\s+πορθμειο/,
                    /einai\s+(?:anoixto|anoichto|kleisto|klisto)\s+to\s+porthmeio/,
                    /λειτουργει\s+(?:η\s+γραμμη|το\s+πορθμειο)/,
                    /δουλευει\s+(?:η\s+)?γραμμη/,
                    /leitourgei\s+(?:i\s+grammi|to\s+porthmeio)/,
                    /(?:douleuei|doulevei)\s+(?:i\s+)?grammi/,
                    /^(?:εχει|υπαρχει)\s+απαγορευτικο$/,
                    /^(?:exei|xei|yparxei)\s+apagoreutiko$/
                ]
            },
            {
                name: 'weather',
                patterns: [
                    /ποσο\s+αερα\s+εχει/,
                    /τι\s+αερα\s+εχει/,
                    /εχει\s+αερα\s+(?:στο\s+)?(?:ριο\s+αντιρριο|πορθμειο)/,
                    /ποσο\s+φυσαει/,
                    /poso\s+aera\s+exei/,
                    /ti\s+aera\s+exei/,
                    /exei\s+aera\s+(?:sto\s+)?(?:rio\s+antirrio|porthmeio)/,
                    /poso\s+fisaei/,
                    /καιρος\s+τωρα|kairos\s+tora/,
                    /τι\s+καιρο\s+εχει|ti\s+kairo\s+exei/,
                    /τι\s+ανεμο\s+εχει|ti\s+anemo\s+exei/,
                    /ποσα\s+μποφορ|posa\s+mpofor/,
                    /τι\s+θερμοκρασια\s+εχει|ti\s+thermokrasia\s+exei/
                ]
            },
            {
                name: 'next3',
                patterns: [
                    /επομενα\s+(?:τρια|3|δρομολογια)/,
                    /epomena\s+(?:tria|3|dromologia)/,
                    /προγραμμα\s+επομενης\s+ωρας?/,
                    /δρομολογια\s+επομενης\s+ωρας?/,
                    /programma\s+epomenis\s+oras?/,
                    /dromologia\s+epomenis\s+oras?/
                ]
            },
            {
                name: 'schedule',
                patterns: [
                    /ωρες\s+δρομολογιων|ωραρια\s+δρομολογιων/,
                    /ores\s+dromologion|oraria\s+dromologion/,
                    /πληρες\s+προγραμμα|plires\s+programma/,
                    /ολα\s+τα\s+δρομολογια|ola\s+ta\s+dromologia/
                ]
            },
            {
                name: 'next',
                patterns: [
                    /^(?:επομενο|epomeno)\s+(?:ριο|rio|αντιρριο|antirrio|antirio)$/,
                    /^(?:επομενο|epomeno)\s+(?:απο|apo)\s+(?:ριο|rio|αντιρριο|antirrio|antirio)$/,
                    /επομενο\s+(?:πλοιο|καραβι)/,
                    /epomeno\s+(?:ploio|karavi)/,
                    /ποτε\s+(?:φευγει|αναχωρει|περναει)/,
                    /pote\s+(?:feugei|anaxorei|pernaei)/,
                    /τι\s+ωρα\s+(?:φευγει|εχει)\s+(?:πλοιο|καραβι)/,
                    /ti\s+ora\s+(?:feugei|exei)\s+(?:ploio|karavi)/,
                    /επομενο\s+απο\s+(?:ριο|αντιρριο)/,
                    /epomeno\s+apo\s+(?:rio|antirrio|antirio|antiriro)/
                ]
            },
            { name: 'prices', patterns: [/τιμες\s+ναυλου/,/times\s+naulou/,/τιμη\s+εισιτηριου/,/timi\s+eisitiriou/,/ποσο\s+(?:κοστιζει|κανει)/,/poso\s+(?:kostizei|kanei)/] },
            { name: 'contacts', patterns: [/τηλεφωνο\s+(?:λιμεναρχειου|λιμενικου)/,/tilefono\s+(?:limenarxeiou|limenikou)/,/στοιχεια\s+επικοινωνιας/,/stoixeia\s+epikoinonias/] },
            { name: 'liveDepartures', patterns: [/live\s+αναχωρησεις/,/live\s+anaxoriseis/,/ζωντανες\s+αναχωρησεις/,/zontanes\s+anaxoriseis/] },
            { name: 'facebook', patterns: [/facebook|facebook/] },
            { name: 'videos', patterns: [/^(?:βιντεο|video)$/,/βιντεο\s+(?:πλοιων|καραβιων|πορθμειου)/,/video\s+(?:ploion|karavion|porthmeiou)/,/youtube/] },
            { name: 'install', patterns: [/εγκατασταση\s+εφαρμογης/,/πως\s+εγκαθιστω\s+(?:την\s+)?εφαρμογη/,/πως\s+(?:τη|την)\s+βαζω\s+(?:στο|στην)\s+(?:κινητο|αρχικη\s+οθονη)/,/egkatastasi\s+efarmogis/,/προσθηκη\s+στην\s+αρχικη\s+οθονη/,/prosthiki\s+stin\s+arxiki\s+othoni/,/install\s+app/] },
            { name: 'history', patterns: [/ιστορια\s+(?:του\s+)?πορθμειου/,/istoria\s+(?:tou\s+)?porthmeiou/] },
            { name: 'photos', patterns: [/παλιες\s+φωτογραφιες/,/palies\s+fotografies/,/φωτογραφιες\s+αρχειου/,/fotografies\s+arxeiou/] }
        ];

        for (const rule of rules) {
            if (rule.patterns.some(function (pattern) {
                return pattern.test(q);
            })) {
                return rule.name;
            }
        }

        return null;
    }

    function detectDirectIntent(text) {
        const n = normalizeText(text);

        const rules = [
            {
                name: 'shipsDetails',
                patterns: [
                    /στοιχεια\s+πλοιων/,
                    /ποσα\s+πλοια\s+(?:ειναι|δουλευουν)(?:\s+(?:στη|στην)\s+γραμμη)?/,
                    /ποια\s+πλοια\s+(?:ειναι|δουλευουν)(?:\s+(?:στη|στην)\s+γραμμη)?/,
                    /ονοματα\s+πλοιων/,
                    /πληροφοριες\s+για\s+τα\s+πλοια/,
                    /stoixeia\s+ploion/,
                    /posa\s+ploia\s+(?:einai|doulevoun|douleuoun)(?:\s+sti\s+grammi)?/,
                    /poia\s+ploia\s+(?:einai|doulevoun|douleuoun)(?:\s+sti\s+grammi)?/,
                    /onomata\s+ploion/
                ]
            },
            {
                name: 'status',
                patterns: [
                    /εκτελουνται\s+δρομολογια/,
                    /εκτελουντε\s+δρομολογια/,
                    /^(?:εχει|υπαρχουν)\s+δρομολογια$/,
                    /^(?:exei|yparxoun)\s+dromologia$/,
                    /γινονται\s+δρομολογια/,
                    /δουλευουν\s+τα\s+(?:πλοια|καραβια)/,
                    /η\s+γραμμη\s+ειναι\s+(?:ανοιχτη|ανοικτη|κλειστη)/,
                    /ειναι\s+(?:ανοιχτη|ανοικτη|κλειστη)\s+η\s+γραμμη/,
                    /ειναι\s+(?:ανοιχτο|κλειστο)\s+το\s+πορθμειο/,
                    /λειτουργει\s+(?:η\s+γραμμη|το\s+πορθμειο)/,
                    /δουλευει\s+(?:η\s+)?γραμμη/,
                    /εχει\s+απαγορευτικο/,
                    /υπαρχει\s+απαγορευτικο/
                ]
            },
            {
                name: 'navigation',
                patterns: [
                    /^(?:χαρτες|χαρτη|xartes|xarti|maps)$/,
                    /(?:χαρτες|xartes)\s+(?:ριο|αντιρριο|rio|antirrio)/,
                    /(?:πως|pos)\s+(?:παω|φτανω|pao|ftano)\s+(?:στο|στον|sto)\s+(?:ριο|αντιρριο|rio|antirrio)/,
                    /(?:πλοηγηση|ploigisi)\s+(?:προς|pros)/
                ]
            },
            {
                name: 'vesselPosition',
                patterns: [
                    /(?:σε\s+)?ποια\s+προβλητα\s+(?:δουλευουν|εργαζονται|ειναι)(?:\s+(?:τα\s+)?(?:πλοια|καραβια))?/,
                    /(?:se\s+)?poia\s+provlita\s+(?:doulevoun|douleuoun|ergazontai|einai)(?:\s+(?:ta\s+)?(?:ploia|karavia))?/,
                    /που\s+(?:ειναι|βρισκονται|δουλευουν)\s+τα\s+(?:πλοια|καραβια)/,
                    /ανατολικα\s+(?:η|ή)\s+δυτικα/,
                    /προς\s+τα\s+που\s+πανε\s+τα\s+πλοια/,
                    /(?:θεση|κινηση)\s+(?:πλοιων|καραβιων)/,
                    /(?:live|ζωντανος)\s+χαρτης\s+πλοιων/,
                    /tracking\s+πλοιων/
                ]
            },
            {
                name: 'forecast',
                patterns: [
                    /προγνωση\s+καιρου/,
                    /τι\s+καιρο\s+θα\s+(?:εχει|κανει)\s+αυριο/,
                    /καιρος\s+αυριο/,
                    /τι\s+ανεμο\s+θα\s+εχει\s+αυριο/,
                    /θα\s+(?:εχει|βγαλει)\s+απαγορευτικο/,
                    /απαγορευτικο\s+αυριο/,
                    /windfinder/,
                    /meteo/
                ]
            },
            {
                name: 'weather',
                patterns: [
                    /καιρος\s+τωρα/,
                    /τι\s+καιρο\s+εχει/,
                    /τι\s+ανεμο\s+εχει/,
                    /ποσα\s+μποφορ/,
                    /τι\s+θερμοκρασια\s+εχει/
                ]
            },
            {
                name: 'distanceGps',
                patterns: [
                    /ποσο\s+απεχω/,
                    /ποση\s+αποσταση/,
                    /ποτε\s+φτανω/,
                    /σε\s+ποση\s+ωρα\s+φτανω/,
                    /ποσο\s+(?:χρονο\s+)?θελω\s+για\s+να\s+φτασω/,
                    /αποσταση\s+gps/,
                    /χρονος\s+αφιξης/
                ]
            },
            {
                name: 'navigation',
                patterns: [
                    /πως\s+(?:φτανω|παω)\s+στο\s+(?:ριο|αντιρριο)/,
                    /πλοηγηση\s+προς\s+(?:το\s+)?(?:ριο|αντιρριο)/,
                    /πλοηγηση\s+προς\s+την\s+προβλητα/,
                    /διαδρομη\s+για\s+(?:το\s+)?(?:ριο|αντιρριο)/,
                    /google\s+maps\s+(?:ριο|αντιρριο)/
                ]
            },
            {
                name: 'next3',
                patterns: [
                    /επομενα\s+(?:τρια|3|δρομολογια)/,
                    /προγραμμα\s+επομενης\s+ωρας?/,
                    /δρομολογια\s+επομενης\s+ωρας?/,
                    /programma\s+epomenis\s+oras?/,
                    /dromologia\s+epomenis\s+oras?/
                ]
            },
            {
                name: 'schedule',
                patterns: [
                    /ωρες\s+δρομολογιων/,
                    /ωραρια\s+δρομολογιων/,
                    /πληρες\s+προγραμμα/,
                    /ολο\s+το\s+προγραμμα/,
                    /ολα\s+τα\s+δρομολογια/
                ]
            },
            {
                name: 'next',
                patterns: [
                    /επομενο\s+(?:πλοιο|καραβι)/,
                    /ποτε\s+(?:φευγει|αναχωρει|περναει)/,
                    /τι\s+ωρα\s+(?:φευγει|εχει)\s+(?:πλοιο|καραβι)/,
                    /επομενο\s+απο\s+(?:ριο|αντιρριο)/,
                    /τι\s+ωρα\s+εχει\s+(?:πλοιο|καραβι)\s+αυριο/
                ]
            },
            {
                name: 'prices',
                patterns: [
                    /τιμες\s+ναυλου/,
                    /τιμη\s+εισιτηριου/,
                    /ποσο\s+πληρωνει\s+(?:το\s+)?(?:ιχ|ι\.χ\.|αυτοκινητο)\s+(?:στο\s+)?(?:πλοιο|καραβι)?/,
                    /poso\s+plironei\s+(?:to\s+)?(?:ix|aftokinito)\s+(?:sto\s+)?(?:ploio|karavi)?/,
                    /ποσο\s+(?:κοστιζει|κανει)/,
                    /τιμη\s+για\s+(?:αυτοκινητο|μηχανη|φορτηγο)/
                ]
            },
            {
                name: 'contacts',
                patterns: [
                    /τηλεφωνο\s+(?:λιμεναρχειου|λιμενικου)/,
                    /στοιχεια\s+επικοινωνιας/,
                    /που\s+να\s+τηλεφωνησω/
                ]
            },
            {
                name: 'liveDepartures',
                patterns: [
                    /live\s+αναχωρησεις/,
                    /ζωντανες\s+αναχωρησεις/,
                    /live\s+departures/
                ]
            },
            {
                name: 'facebook',
                patterns: [
                    /facebook/,
                    /βρειτε\s+μας\s+στο\s+facebook/
                ]
            },
            {
                name: 'videos',
                patterns: [
                    /^(?:βιντεο|video)$/,
                    /βιντεο\s+(?:πλοιων|καραβιων|πορθμειου)/,
                    /video\s+(?:ploion|karavion|porthmeiou)/,
                    /youtube\s+(?:πλοια|καραβια|rio|antirrio)/
                ]
            },
            {
                name: 'install',
                patterns: [
                    /εγκατασταση\s+εφαρμογης/,
                    /πως\s+εγκαθιστω\s+(?:την\s+)?εφαρμογη/,
                    /πως\s+(?:τη|την)\s+βαζω\s+(?:στο|στην)\s+(?:κινητο|αρχικη\s+οθονη)/,
                    /προσθηκη\s+στην\s+αρχικη\s+οθονη/,
                    /install\s+app/,
                    /add\s+to\s+home\s+screen/
                ]
            },
            {
                name: 'history',
                patterns: [
                    /ιστορια\s+(?:του\s+)?πορθμειου/,
                    /ιστορικα\s+στοιχεια/
                ]
            },
            {
                name: 'photos',
                patterns: [
                    /παλιες\s+φωτογραφιες/,
                    /φωτογραφιες\s+αρχειου/,
                    /ριο\s+καποτε/
                ]
            }
        ];

        for (const rule of rules) {
            if (rule.patterns.some(function (pattern) {
                return pattern.test(n);
            })) {
                return rule.name;
            }
        }

        return null;
    }

    function scoreIntent(text, intent) {
        const normalized = normalizeText(text);
        const wordSet = tokens(normalized);
        let score = 0;
        let phraseHits = 0;
        let keywordHits = 0;

        intent.phrases.forEach(function (phrase) {
            const normalizedPhrase = normalizeText(phrase);

            if (normalizedPhrase && normalized.includes(normalizedPhrase)) {
                phraseHits += 1;
                score += 14 + Math.min(normalizedPhrase.length / 8, 5);
            }
        });

        intent.keywords.forEach(function (keyword) {
            if (fuzzyHas(wordSet, keyword)) {
                keywordHits += 1;
                score += 3;
            }
        });

        if (intent.requiredAny && intent.requiredAny.length) {
            const passesRequired = intent.requiredAny.some(function (keyword) {
                return fuzzyHas(wordSet, keyword);
            });

            if (!passesRequired) return 0;
        }

        if (phraseHits > 1) score += 4;
        if (keywordHits >= 2) score += 3;
        if (keywordHits >= 3) score += 4;

        return score;
    }

    function detectIntentDetailed(text) {
        let best = {
            name: null,
            score: 0,
            priority: 0
        };

        Object.keys(INTENTS).forEach(function (name) {
            const intent = INTENTS[name];
            const score = scoreIntent(text, intent);

            if (
                score > best.score ||
                (
                    score === best.score &&
                    intent.priority > best.priority
                )
            ) {
                best = {
                    name: name,
                    score: score,
                    priority: intent.priority
                };
            }
        });

        return best;
    }

    function isGeneralTomorrowScheduleQuestion(text) {
        const raw = normalizeRawQuery(text);
        const normalized = normalizeText(text);
        const combined = raw + ' ' + normalized;

        const asksFutureDay =
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio)/.test(combined) ||
            /(?:δευτερα|τριτη|τεταρτη|πεμπτη|παρασκευη|σαββατο|κυριακη)/.test(combined);

        const asksOperation =
            /(?:δρομολογια|dromologia|καραβια|karavia|πλοια|ploia|δουλευει|δουλευουν|doulevei|doulevoun)/.test(combined);

        const hasWeather =
            /(?:καιρο|καιρος|ανεμο|βροχη|προγνωση|kairo|kairos|anemo|vroxi|prognosi)/.test(combined);

        const hasSpecificTime =
            parseRequestedHour(text) !== null ||
            detectDayPart(text) !== null ||
            /(?:μετα|πριν|μεχρι|εως|meta|prin|mexri)/.test(combined);

        const hasSpecificDirection = detectPort(text) !== null;

        const asksNamedTrip =
            /(?:πρωτο|τελευταιο|επομενο|proto|teleutaio|epomeno)\s+(?:δρομολογιο|πλοιο|καραβι|dromologio|ploio|karavi)/.test(combined);

        return Boolean(
            asksFutureDay &&
            asksOperation &&
            !hasWeather &&
            !hasSpecificTime &&
            !hasSpecificDirection &&
            !asksNamedTrip
        );
    }


    function detectLockedIntent(text, raw, normalized, combined) {
        /* 01. SOCIAL — exact matching μόνο, για μηδενικές συγκρούσεις με operational intents. */
        if (
            /^(?:γεια|γεια σου|γεια σας|χαιρετε|καλημερα|καλησπερα|καληνυχτα|καλο βραδυ|geia|geia sou|geia sas|kalimera|kalispera|kalinixta|kalinuxta|kalo vradi|hello|hi)$/.test(raw) ||
            /^(?:ευχαριστω|ευχαριστω πολυ|σε ευχαριστω|να εισαι καλα|να ειστε καλα|euxaristo|euxaristo poli|na eisai kala|na eiste kala|thanks|thank you)$/.test(raw) ||
            /^(?:μπορω να ρωτησω|μπορω να ρωτησω κατι|να ρωτησω|να ρωτησω κατι|θελω να ρωτησω κατι|mporo na rotiso|mporo na rotiso kati|na rotiso|na rotiso kati|thelo na rotiso kati)$/.test(raw) ||
            /^(?:τελεια|μπραβο|ενταξει|καταλαβα|σωστα|teleia|bravo|entaxi|katalava|sosta|ok)$/.test(raw) ||
            /^(?:αντιο|τα λεμε|καλη συνεχεια|καλο ταξιδι|antio|ta leme|kali sinexeia|kalo taxidi|bye|goodbye)$/.test(raw) ||
            /^(?:παρακαλω|parakalo)$/.test(raw)
        ) return 'social';

        /* Δυνατότητες / βοήθεια — μία καθαρή κατηγορία. */
        if (
            /^(?:βοηθεια|help|voitheia)$/.test(raw) ||
            /^(?:τι|ti|ποσα|posa)\s+(?:ξερεις|ξερεισ|xereis|ksereis|γνωριζεις|γνωριζεισ|gnorizeis)$/.test(raw) ||
            /^(?:τι|ti)\s+(?:μπορεις|mporeis)\s+(?:να\s+|na\s+)?(?:κανεις|kaneis|απαντησεις|apantiseis)$/.test(raw) ||
            /^(?:τι|ti)\s+(?:μπορω|mporo)\s+(?:να\s+|na\s+)?(?:ρωτησω|rotiso)$/.test(raw) ||
            /^(?:τι|ti)\s+(?:ερωτησεις|erotiseis)\s+(?:μπορω|mporo)\s+(?:να\s+|na\s+)?(?:κανω|kano)$/.test(raw) ||
            /^(?:σε\s+τι|se\s+ti)\s+(?:μπορεις|mporeis)\s+(?:να\s+|na\s+)?(?:απαντησεις|apantiseis)$/.test(raw) ||
            /^(?:τι|ti)\s+(?:πληροφοριες|plirofories)\s+(?:παρεχεις|parexeis|δινεις|dineis)$/.test(raw) ||
            /^(?:τι|ti)\s+(?:πληροφοριες|plirofories)\s+(?:μπορω|mporo)\s+(?:να\s+|na\s+)?(?:εχω|exo)$/.test(raw) ||
            /^(?:πως|πωσ|pos)\s+(?:μπορεις|mporeis)\s+(?:να\s+|na\s+)?(?:με\s+|me\s+)?(?:βοηθησεις|voithiseis)$/.test(raw) ||
            /^(?:με\s+τι|me\s+ti)\s+(?:μπορεις|mporeis)\s+(?:να\s+|na\s+)?(?:με\s+|me\s+)?(?:βοηθησεις|voithiseis)$/.test(raw) ||
            /^(?:τι|ti)\s+(?:μπορω|mporo)\s+(?:να\s+|na\s+)?(?:σε\s+|se\s+)(?:ρωτησω|rotiso)$/.test(raw) ||
            /^(?:ποιες|poies)\s+(?:πληροφοριες|plirofories)\s+(?:εχεις|exeis)$/.test(raw) ||
            /^(?:τι|ti)\s+(?:πληροφοριες|plirofories)\s+(?:ξερεις|xereis|ksereis)$/.test(raw) ||
            /^(?:τι|ti)\s+(?:υπηρεσιες|ipiresies)\s+(?:παρεχεις|parexeis)$/.test(raw) ||
            /^(?:τι|ti)\s+(?:δυνατοτητες|dinatotites)\s+(?:εχεις|exeis)$/.test(raw) ||
            /^(?:τι|ti)\s+(?:μπορει|mporei)\s+(?:να\s+|na\s+)?(?:κανει|kanei)\s+(?:(?:ο|o)\s+)?(?:assistant|βοηθος|voithos)$/.test(raw) ||
            /^(?:τι|ti)\s+(?:ερωτησεις|erotiseis)\s+(?:απαντας|apantas)$/.test(raw) ||
            /^(?:για\s+τι\s+πραγματα|gia\s+ti\s+pragmata)\s+(?:μπορω|mporo)\s+(?:να\s+|na\s+)?(?:σε\s+|se\s+)(?:ρωτησω|rotiso)$/.test(raw) ||
            /^(?:τι|ti)\s+(?:ξερεις|ξερεισ|xereis|ksereis|γνωριζεις|γνωριζεισ|gnorizeis)\s+(?:για|gia)\s+(?:(?:τη|την|ti|tin)\s+)?(?:γραμμη|grammi)$/.test(raw) ||
            /^(?:τι|ti)\s+(?:ξερεις|ξερεισ|xereis|ksereis|γνωριζεις|γνωριζεισ|gnorizeis)\s+(?:για|gia)\s+(?:το|to)\s+(?:ριο\s+αντιρριο|rio\s+antirrio)$/.test(raw)
        ) return 'assistantCapabilities';

        /* Ταυτότητα / υπηρεσία / δημιουργία / ιδιοκτησία. */
        if (
            /^(?:ποιος|ποια|ποιο|τι|poios|poia|poio|ti)\s+(?:εισαι|eisai)$/.test(raw) ||
            /^(?:τι\s+ειναι|ti\s+einai)\s+(?:(?:ο|η|το|o|i|to)\s+)?(?:rio\s+antirrio\s+)?(?:ai\s+assistant|assistant|ferries|live|app|εφαρμογη|υπηρεσια)$/.test(raw) ||
            /(?:σε\s+ποιον\s+ανηκει|se\s+poion\s+anikei|ποιος\s+ειναι\s+πισω\s+απο|poios\s+einai\s+piso\s+apo|ποιος\s+εφτιαξε|poios\s+eftiaxe|ποιος\s+δημιουργησε|poios\s+dimiourgise|ποιος\s+διαχειριζεται|ποιος\s+διαχειριζετε|poios\s+diaxeirizetai|poios\s+diaxeirizete|poios\s+diaxirizetai|poios\s+diaxirizete|ποιος\s+το\s+τρεχει|poios\s+to\s+trexei).*?(?:rio\s+antirrio|ferries|assistant|live|app|εφαρμογη|σελιδα|selida|υπηρεσια)/.test(raw) ||
            /^(?:ποιος|poios)\s+(?:σε\s+|se\s+)(?:εφτιαξε|eftiaxe|δημιουργησε|dimiourgise|διαχειριζεται|διαχειριζετε|diaxeirizetai|diaxeirizete|diaxirizetai|diaxirizete)$/.test(raw) ||
            /^(?:ποιος|poios)\s+(?:ειναι\s+|einai\s+)(?:(?:ο|o)\s+)?(?:δημιουργος|dimiourgos)(?:\s+(?:σου|sou))?$/.test(raw) ||
            /^(?:ποιος|poios)\s+(?:διαχειριζεται|διαχειριζετε|diaxeirizetai|diaxeirizete|diaxirizetai|diaxirizete)\s+(?:τη\s+|την\s+|ti\s+|tin\s+)?(?:σελιδα|selida|εφαρμογη|efarmogi|assistant)$/.test(raw) ||
            /^(?:σε\s+ποιον|se\s+poion)\s+(?:ανηκει|anikei)\s+(?:η\s+|ο\s+|i\s+|o\s+)?(?:σελιδα|selida|εφαρμογη|efarmogi|assistant)$/.test(raw) ||
            /^(?:ειναι|einai)\s+(?:ιδιωτικη|idiotiki)\s+(?:υπηρεσια|ipiresia|πρωτοβουλια|protovoulia)$/.test(raw) ||
            /^(?:ειναι|einai)\s+(?:επισημη|episimi)\s+(?:υπηρεσια|ipiresia)$/.test(raw) ||
            /^(?:ανηκει|anikei)\s+(?:στο|στις|sto|stis)\s+(?:λιμενικο|limeniko|λιμεναρχειο|limenarxeio|πλοιοκτητριες\s+εταιρειες|ploioktitries\s+etaireies)$/.test(raw) ||
            /^(?:ειναι|einai)\s+(?:του|tou)\s+(?:κρατους|kratous)$/.test(raw)
        ) return 'assistantAbout';

        /* =========================================================
           SAFE ENRICHMENT GUARDS — v1.0.0
           Narrow, explicit rules only. These protect existing intents from
           generic words such as live / πόσο / πότε / πλοίο.
           ========================================================= */

        /* LIVE: departures must win over generic live/GPS; app name stays liveApp. */
        if (
            /(?:live)\s+(?:αναχωρ|anaxor|departures?)/.test(raw) ||
            /(?:ζωνταν|zontan).*?(?:αναχωρ|anaxor)/.test(raw)
        ) return 'liveDepartures';

        /* Install: installation wording wins even when "Rio-Antirrio Live" is present. */
        if (
            /(?:πως|πωσ|pos).*?(?:κατεβαζω|katevazo).*?(?:εφαρμογη|efarmogi|app)/.test(raw) ||
            /(?:πως|πωσ|pos).*?(?:βαζω|vazo).*?(?:rio\s+antirrio\s+live|εφαρμογη|efarmogi|app).*?(?:κινητο|kinito)/.test(raw) ||
            /(?:θελω|thelo).*?(?:βαλω|valo).*?(?:εφαρμογη|efarmogi|app).*?(?:κινητο|kinito)/.test(raw) ||
            /(?:πως|πωσ|pos)\s+(?:το|to)\s+(?:βαζω|vazo)\s+(?:στην|stin)\s+(?:αρχικη|arxiki)\s+(?:οθονη|othoni)/.test(raw) ||
            /(?:πως|πωσ|pos).*?(?:εικονιδιο|eikonidio).*?(?:αρχικη|arxiki)/.test(raw) ||
            /(?:μπορω|mporo).*?(?:εγκαταστησω|egkatastiso).*?(?:εφαρμογη|efarmogi|app)/.test(raw)
        ) return 'install';

        /* First/last departure are part of 24-hour operation. */
        if (
            /(?:πρωτο|proto|τελευταιο|teleutaio).*?(?:δρομολογιο|καραβι|πλοιο|dromologio|karavi|ploio)/.test(raw) ||
            /(?:πρωτο|proto|τελευταιο|teleutaio)\s+(?:απο|apo)\s+(?:ριο|αντιρριο|rio|antirrio|antirio|antiriro)/.test(raw) ||
            /(?:τι\s+ωρα|ti\s+ora).*?(?:ξεκινα|ksekina).*?(?:καραβια|πλοια|δρομολογια|karavia|ploia|dromologia)/.test(raw) ||
            /(?:μεχρι\s+τι\s+ωρα|mexri\s+ti\s+ora).*?(?:καραβια|πλοια|δρομολογια|karavia|ploia|dromologia)/.test(raw)
        ) return 'continuousOperation';

        /* Accessibility is distinct from reduced fare. */
        if (
            (/(?:αμεα|amea)/.test(raw) && /(?:προσβασ|prosvasi|επιβιβ|epiviv|βοηθ|voith|εξυπηρετ|eksypiret|μπω|μπαινω|mpo|mpaino|mpeno)/.test(raw)) ||
            /(?:αναπηρ|anapir).*?(?:αμαξιδ|amaxid)/.test(raw) ||
            /(?:κινητικ|kinitik).*?(?:προβλημα|provlima|κινητικοτητα|kinitikot|επιβιβ|epiviv|μπω|mpo)/.test(raw) ||
            /^(?:αμεα|amea)\s+(?:στο|sto)\s+(?:καραβι|πλοιο|karavi|ploio)$/.test(raw)
        ) return 'accessibleBoarding';

        /* Reduced fare: keep generic eligibility wording in the reduced-fare category. */
        if (
            /^(?:τι|ti)\s+(?:χρειαζεται|xreiazetai)\s+(?:για|gia)\s+(?:μειωμενο|meiomeno)\s+(?:ναυλο|naulo|navlo)$/.test(raw) ||
            /^(?:ποιες|poies)\s+(?:ειναι|einai)\s+(?:οι|oi)\s+(?:προυποθεσεις|proypotheseis)\s+(?:για|gia)\s+(?:μειωμενο|meiomeno)\s+(?:ναυλο|naulo|navlo)$/.test(raw) ||
            /^(?:ποιοι|poioi)\s+(?:δικαιουνται|dikaiountai)\s+(?:μειωμενο|meiomeno)\s+(?:ναυλο|naulo|navlo)$/.test(raw) ||
            /(?:ποιε|poie).*?(?:προυποθεσ|proypothes).*?(?:μειωμεν|meiomen).*?(?:ναυλ|naul|navl)/.test(raw) ||
            /(?:τριτεκν|tritekn).*?(?:πολυτεκν|politekn|polytekn)/.test(raw)
        ) return 'specialFareEligibility';

        /* Photos: ship-specific photos stay shipsDetails; archive/general photos go photos. */
        if (/(?:φωτογραφ|fotograf)/.test(raw) && /(?:πλοι|καραβ|ploi|karav)/.test(raw)) return 'shipsDetails';
        if (/(?:φωτογραφ|fotograf)/.test(raw) && /(?:υπαρχ|εχετε|θελω|δω|δειτε|αρχει|καποτε|uparx|yparx|exete|thelo|do|arxei|kapote)/.test(raw)) return 'photos';

        /* Departure point / working side. */
        if (
            /(?:απο\s+που|που|apo\s+pou|pou)\s+(?:παιρνω|περνω|pairno|perno|pernw|painrno)\s+(?:(?:το|to)\s+)?(?:καραβι|πλοιο|karavi|ploio)/.test(raw) ||
            /(?:που|pou)\s+(?:πρεπει|prepei)\s+(?:να\s+|na\s+)?(?:παω|pao)\s+(?:για|gia)\s+(?:(?:το|to)\s+)?(?:καραβι|πλοιο|karavi|ploio)/.test(raw) ||
            /(?:δειξε|deikse).*?(?:θεση|κινηση|thesi|kinisi).*?(?:πλοι|καραβ|ploi|karav)/.test(raw)
        ) return 'departurePoint';
        if (
            /(?:απο\s+ποια|apo\s+poia)\s+(?:πλευρα|plevra).*?(?:καραβι|πλοιο|karavi|ploio)/.test(raw) ||
            /(?:σε\s+ποια|se\s+poia)\s+(?:πλευρα|plevra).*?(?:καραβια|πλοια|karavia|ploia)/.test(raw)
        ) return 'vesselPosition';

        /* Active/assigned vessel information is intentionally unavailable. */
        if (
            /^(?:ποσα|ποια|ποιο|posa|poia|poio)\s+(?:πλοια|καραβια|πλοιο|καραβι|ploia|karavia|ploio|karavi).*?(?:δουλευουν|δουλευει|λειτουργουν|λειτουργει|ειναι\s+σε\s+λειτουργια|ειναι\s+σε\s+υπηρεσια|εκτελουν|εκτελει|doulevoun|doulevei|leitourgoun|leitourgei|einai\s+se\s+leitourgia|einai\s+se\s+ypiresia|ekteloun|ektelei)/.test(raw)
        ) return 'assignedVesselUnavailable';

        /* Crossing duration — explicitly exclude arrival/GPS wording. */
        if (
            !/(?:φτασω|φτανω|ftaso|ftano|προβλητα|provlita|gps|απεχω|apexo)/.test(combined) &&
            (
                /(?:ποση|posi)\s+(?:ωρα|ora)\s+(?:κανει|kanei)\s+(?:(?:το|to)\s+)?(?:καραβι|πλοιο|ferry|karavi|ploio)/.test(combined) ||
                /(?:ποσο|poso)\s+(?:χρονο|xrono)\s+(?:κανει|kanei)\s+(?:(?:το|to)\s+)?(?:καραβι|πλοιο|ferry|karavi|ploio)/.test(combined) ||
                /(?:ποσο|poso)\s+(?:διαρκει|diarkei)\s+(?:(?:το|to)\s+)?(?:ταξιδι|διαδρομη|διαπλουσ|taxidi|diadromi|diaplous)/.test(combined) ||
                /(?:διαρκεια|diarkeia)\s+(?:διαπλου|diaplou)/.test(combined) ||
                /(?:ποση|posi)\s+(?:ωρα|ora)\s+(?:κανει|kanei)\s+(?:απεναντι|apenanti)/.test(combined)
            )
        ) return 'tripDuration';

        /* Booking/ticket wording uses the existing payment answer. */
        if (
            /(?:χρειαζεται|xreiazetai|πρεπει|prepei).*?(?:κρατηση|kratisi|κλεισω\s+θεση|kleiso\s+thesi|κλεισω\s+εισιτηριο|kleiso\s+eisitirio)/.test(combined) ||
            /(?:κλεινω|kleino|βγαζω|vgazo).*?(?:εισιτηριο|eisitirio).*?(?:απο\s+πριν|apo\s+prin)/.test(combined) ||
            /(?:online).*?(?:κρατηση|kratisi)/.test(combined)
        ) return 'payment';

        /* Keep small registered categories alive. */
        if (/(?:επιτρεπονται|epitrepontai).*?(?:ζωα|zoa).*?(?:καραβι|πλοιο|karavi|ploio)/.test(raw)) return 'petsOnBoard';
        if (/(?:ποτε|pote).*?(?:ξεκινησε|ksekinise).*?(?:πορθμειο|porthmeio)/.test(raw)) return 'history';
        if (/^(?:καιρικ|kairik).*?(?:συνθηκ|synthik)/.test(raw)) return 'weather';
        if (/^(?:τι|ti)\s+(?:απαντ|apant)/.test(raw)) return 'assistantCapabilities';

        /* FINAL LOCKED TESTS — 11 Αυγούστου 2026. Narrow guards only. */
        if (/^(?:σε\s+ποιον|se\s+poion)\s+(?:ανηκεις|anikeis)$/.test(raw) || /^(?:που|pou)\s+(?:ανηκεις|anikeis)$/.test(raw) || /^(?:ποιος|poios)\s+(?:ειναι\s+|einai\s+)?(?:ο\s+|o\s+)?(?:ιδιοκτητης|idioktitis)$/.test(raw) || /^(?:ποιος\s+ειναι\s+πισω\s+απο\s+εσενα|poios\s+einai\s+piso\s+apo\s+esena)$/.test(raw)) return 'assistantAbout';
        if (/(?:ποτε|pote|τι\s+ωρα|ti\s+ora)\s+(?:σταματα|σταματαει|σταματουν|stamata|stamataei|stamatoun).*?(?:γραμμη|δρομολογια|καραβια|πλοια|grammi|dromologia|karavia|ploia)/.test(raw)) return 'continuousOperation';
        if (/^(?:καθε\s+ποτε|kathe\s+pote)\s+(?:περναει|φευγει|εχει|pernaei|feugei|exei)\s+(?:(?:το|to)\s+)?(?:καραβι|πλοιο|karavi|ploio)$/.test(raw) || /^(?:πρωινα|απογευματινα|βραδινα|νυχτερινα|proina|apogeumatina|vradina|nyxterina)\s+(?:δρομολογια|dromologia)$/.test(raw) || /^(?:δρομολογια|dromologia)\s+(?:το\s+|τη\s+|ti\s+)?(?:πρωι|απογευμα|βραδυ|νυχτα|proi|apogeuma|vradi|nyxta)$/.test(raw)) return 'frequency';
        if (/^(?:πως|πωσ|pos)\s+(?:παω|pao)\s+(?:στο|sto)\s+(?:καραβι|πλοιο|karavi|ploio)$/.test(raw) || /^(?:ποσο|poso)\s+(?:θελω|thelo)(?:\s+(?:χρονο|xrono))?\s+(?:για|μεχρι|gia|mexri)\s+(?:την|τη|tin|ti)\s+(?:προβλητα|provlita)$/.test(raw) || /^(?:ποσο|poso)\s+(?:απεχω|apexo)\s+(?:απο|apo)\s+(?:την|τη|tin|ti)\s+(?:προβλητα|provlita)$/.test(raw)) return 'distanceGps';
        if (/(?:απο\s+)?(?:ποια|poia)\s+(?:προβλητα|provlita).*?(?:φευγει|αναχωρει|feugei|anaxorei).*?(?:καραβι|πλοιο|karavi|ploio)/.test(raw) || /(?:καραβι|πλοιο|karavi|ploio).*?(?:απο\s+)?(?:ποια|poia)\s+(?:προβλητα|provlita).*?(?:φευγει|αναχωρει|feugei|anaxorei)/.test(raw) || /(?:σε\s+ποια|se\s+poia)\s+(?:προβλητα|provlita)\s+(?:ειναι|einai)\s+(?:(?:το|to)\s+)?(?:καραβι|πλοιο|karavi|ploio)/.test(raw)) return 'departurePoint';
        /* Σκέτο «φεύγει καράβι/πλοίο από Ρίο/Αντίρριο;» = λειτουργία γραμμής, όχι ώρα αναχώρησης. */
        if (/^(?:φευγει|feugei)\s+(?:(?:το|to)\s+)?(?:καραβι|πλοιο|karavi|ploio)\s+(?:απο|apo)\s+(?:(?:το|to)\s+)?(?:ριο|αντιρριο|rio|antirrio|antirio|antiriro)$/.test(raw) || /^(?:φευγουν|feugoun)\s+(?:καραβια|πλοια|karavia|ploia)\s+(?:απο|apo)\s+(?:(?:το|to)\s+)?(?:ριο|αντιρριο|rio|antirrio|antirio|antiriro)$/.test(raw)) return 'status';
        if (/(?:μηχανη|μηχανακι|μηχανακια|μοτο|mixani|mixanaki|mixanakia|moto|motor|scooter|παπι|papi)/.test(raw) && /(?:ποσο|ποσα|poso|posa|πληρωνει|πληρωνω|plironei|plirono|κανει|kanei|κοστιζει|kostizei|τιμη|timi|ναυλο|navlo)/.test(raw)) return 'prices';
        /* «χωρίς αμάξι/όχημα» σημαίνει πεζός επιβάτης και υπερισχύει της λέξης αμάξι. */
        if (/(?:χωρισ|xoris)\s+(?:(?:απο|apo)\s+)?(?:αμαξι|αυτοκινητο|οχημα|amaksi|amaxi|autokinito|aftokinito|oxima)/.test(raw) && /(?:επιβατ|epivat|ποσο|poso|πληρων|pliron|κοστι|kost|τιμη|timi|ναυλο|navlo|δωρεαν|dorean)/.test(raw)) return 'passengerFare';
        if (/(?:πεζοι|πεζος|πεζο|επιβατες|επιβατης|pezoi|pezos|epivates|epivatis)/.test(raw) && /(?:πληρων|κοστι|τιμη|ναυλο|δωρεαν|pliron|kost|timi|navlo|dorean)/.test(raw)) return 'passengerFare';
        if (/(?:γεφυρα|gefura|gefyra|διοδια|diodia|diodion)/.test(raw) && /(?:ριο|αντιρριο|rio|antirrio|γεφυρα|gefura|gefyra|διοδια|diodia|diodion|τιμη|τιμες|timi|times|ποσο|poso|κοστος|kostos|οχημα|αμαξι|αυτοκινητο|μηχανακι|εκπτωτικ|sigrisi|συγκριση)/.test(raw)) return 'bridgeInfo';
        if (/(?:πολυτεκν|politekn|polytekn|αμεα|amea|τριτεκν|tritekn)/.test(raw) && /(?:καρτα|δικαιολογητικ|ισχυ|εκπτωση|μειωμεν|ναυλο|οχημα|τιμη|ποσο|πληρων|κοστι|δικαιου|προυποθε|karta|dikaiolog|isxy|isxi|isx|ekptosi|meiomen|navlo|oxima|timi|poso|pliron|kost|dikaiou|proypoth)/.test(raw)) return 'specialFareEligibility';
        if (/(?:κατοικιδ|σκυλ|γατ|μελωδικ.*πτην|οικοσιτ|παραγωγικ.*ζω|κοτ|προβατ|κατσικ|αλογ|katoikid|skyl|gat|melodik.*ptin|oikosit|paragogik.*zo|kot|provat|katsik|alog)/.test(raw) && /(?:καραβι|πλοιο|επιτρεπ|μεταφερ|παρω|φερω|περασω|karavi|ploio|epitrep|metafer|paro|fero|peraso)/.test(raw)) return 'petsOnBoard';
        if (/^(?:ποσα|ποια|ποιο|posa|poia|poio)\s+(?:πλοια|καραβια|πλοιο|καραβι|ploia|karavia|ploio|karavi).*?(?:δουλευουν|δουλευει|λειτουργουν|λειτουργει|εκτελουν|εκτελει|ειναι\s+σε\s+υπηρεσια|εχει\s+βαρδια|doulevoun|doulevei|leitourgoun|leitourgei|ekteloun|ektelei|einai\s+se\s+ypiresia|exei\s+vardia).*?(?:τωρα|tora)$/.test(raw)) return 'assignedVesselUnavailable';

        /* 02. ΘΕΣΗ ΠΛΟΙΩΝ — σαφείς ερωτήσεις προβλήτας/ανατολικά-δυτικά. */
        if (
            /^(?:ποιες\s+προβλητες\s+δουλευουν|poies\s+provlites\s+doulevoun)$/.test(raw) ||
            /^(?:απο\s+ποιες\s+προβλητες\s+φευγουν\s+τα\s+(?:καραβια|πλοια)|apo\s+poies\s+provlites\s+feugoun\s+ta\s+(?:karavia|ploia))$/.test(raw) ||
            /^(?:τα\s+(?:καραβια|πλοια)\s+δουλευουν\s+ανατολικα\s+(?:η|ή)\s+δυτικα|ta\s+(?:karavia|ploia)\s+doulevoun\s+anatolika\s+i\s+(?:dutika|ditika))$/.test(raw)
        ) return 'vesselPosition';

        /* 03. ΘΕΣΗ ΠΛΟΙΩΝ — ασφαλές Greeklish typo: «pou dulevoun ta karavia/ploia». */
        if (
            /^(?:pou)\s+(?:dulevoun)\s+(?:ta\s+)?(?:karavia|ploia)$/.test(raw) ||
            /^(?:apo\s+pou)\s+(?:dulevoun)\s+(?:ta\s+)?(?:karavia|ploia)$/.test(raw) ||
            /^(?:se\s+poia\s+provlita)\s+(?:dulevoun)\s+(?:ta\s+)?(?:karavia|ploia)$/.test(raw)
        ) return 'vesselPosition';

        /* 04. STATUS — ύπαρξη δρομολογίων από συγκεκριμένη πλευρά = OPEN / CLOSE. */
        if (
            /^(?:εχει|υπαρχουν|exei|yparxoun)\s+(?:δρομολογια|dromologia)\s+(?:απο|apo)\s+(?:το\s+|to\s+)?(?:ριο|αντιρριο|rio|antirrio|antirio|antiriro)$/.test(raw)
        ) return 'status';

        /* «Επόμενες αναχωρήσεις;» = επόμενο διαθέσιμο δρομολόγιο από Ρίο + Αντίρριο. */
        if (
            /^(?:επομενες|epomenes)\s+(?:αναχωρησεις|anaxoriseis)$/.test(raw)
        ) return 'next';

        /* 05. ΔΙΑΡΚΕΙΑ — όταν υπάρχει «απέναντι», το «πόσο κάνει» σημαίνει χρόνο διέλευσης. */
        if (
            /^(?:ποσο|poso)\s+(?:κανει|kanei)\s+(?:να\s+|na\s+)?(?:περασει|παρεσει|perasei|paresei)\s+(?:απεναντι|apenanti)$/.test(raw)
        ) return 'tripDuration';

        /* Αμφίσημο «πόσο κάνει να περάσει;» χωρίς «απέναντι» = διευκρίνιση κόστους ή διάρκειας. */
        if (
            /^(?:ποσο|poso)\s+(?:κανει|kanei)\s+(?:να\s+|na\s+)?(?:περασει|παρεσει|perasei|paresei)$/.test(raw)
        ) return 'fareOrDurationClarify';

        /* Σύντομο «περνάει απέναντι;» = τρέχουσα λειτουργία γραμμής. */
        if (
            /^(?:περναει|pernaei|περνανε|pernane)(?:\s+(?:τα|ta)\s+(?:καραβια|πλοια|karavia|ploia))?\s+(?:απεναντι|apenanti)$/.test(raw)
        ) return 'status';

        /* «Έκλεισε η γραμμή / το πορθμείο;» = τρέχουσα κατάσταση. */
        if (
            /^(?:εκλεισε|eklise|ekleise)\s+(?:η\s+|i\s+|το\s+|to\s+)?(?:γραμμη|πορθμειο|grammi|porthmeio)$/.test(raw)
        ) return 'status';

        /* FINAL TEST CANDIDATE — locked intent overrides. */

        /* Επόμενο ferry με σαφή «επόμενο» = next, όχι next3/status. */
        if (
            /(?:επομενο|epomeno)\s+(?:ferry(?:\s+boat)?|καραβι|πλοιο|karavi|ploio)(?:\s+(?:απο|apo)\s+(?:ριο|ριου|αντιρριο|αντιρριου|rio|riou|antirrio|antirriou))?/.test(combined)
        ) return 'next';

        /* Ρητή διάρκεια διέλευσης. */
        if (
            /(?:ποσο|poso)\s+(?:χρονο|xrono).*?(?:θελει|thelei|χρειαζεται|xreiazetai).*?(?:διελευση|dieleusi|διαδρομη|diadromi)/.test(combined)
        ) return 'tripDuration';

        /* «Πότε φτάνει το καράβι/πλοίο;» = χρόνος διέλευσης. */
        if (
            /^(?:ποτε|pote)\s+(?:φτανει|ftanei)\s+(?:(?:το|to)\s+)?(?:καραβι|πλοιο|karavi|ploio|ferry(?:\s+boat)?)$/.test(raw) ||
            /(?:σε\s+ποσα\s+λεπτα|se\s+posa\s+lepta).*?(?:φτανει|ftanei).*?(?:καραβι|πλοιο|karavi|ploio)/.test(combined) ||
            /(?:ποση\s+ωρα|posi\s+ora).*?(?:κανει|kanei).*?(?:φτασει|ftasei).*?(?:απεναντι|apenanti)/.test(combined)
        ) return 'tripDuration';

        /* Αλλαγή / τροποποίηση επίσημου προγράμματος. */
        if (
            /(?:αλλαγ|αλλαξ|τροποποι|νεο\s+προγραμμα|νεο\s+ωραριο|ενημερωθ|ανανεωθ|allag|allax|tropopoi|neo\s+programma|neo\s+orario|enimeroth|ananeoth).*?(?:δρομολογ|προγραμμα|ωρεσ|ωραριο|αναχωρησ|dromolog|programma|ores|orario|anaxoris)/.test(combined) ||
            /(?:δρομολογ|προγραμμα|ωρεσ|ωραριο|αναχωρησ|dromolog|programma|ores|orario|anaxoris).*?(?:αλλαγ|αλλαξ|τροποποι|νεο|ενημερωθ|ανανεωθ|allag|allax|tropopoi|neo|enimeroth|ananeoth)/.test(combined)
        ) return 'scheduleUpdates';

        /* Επικοινωνία με πλοιοκτήτριες εταιρείες / κοινοπραξία / εργασία. */
        if (
            /(?:ψαχνω|psaxno|θελω|thelo)\s+(?:(?:για|gia)\s+)?(?:δουλεια|douleia|εργασια|ergasia)|(?:ζητατε|zitate)\s+(?:προσωπικο|prosopiko)|(?:θελω|thelo)\s+(?:να\s+|na\s+)?(?:δουλεψω|douleps[o]?)(?:\s+(?:στα|sta)\s+(?:πλοια|καραβια|ploia|karavia))?/.test(combined) ||
            /(?:πλοιοκτητ|πλοιοκτητρι|πλοιοκτητεσ|εταιρειεσ\s+πλοιων|κοινοπραξ|ploiokt|eteries\s+ploion|etairies\s+ploion|koinoprax)/.test(combined) ||
            /(?:βιογραφικ|viografik|\bcv\b|ναυτικο\s+φυλλαδιο|naftiko\s+filadio|προσληψ|proslips|δουλεια\s+(?:στα|σε)\s+(?:πλοια|καραβια)|douleia\s+(?:sta|se)\s+(?:ploia|karavia)|\bcrew\b)/.test(combined) ||
            /(?:επικοινων|epikoin).*?(?:εταιρει|eteri|etairi|πλοιοκτητ|ploiokt|κοινοπραξ|koinoprax)/.test(combined) ||
            /(?:τηλεφων|tilefon).*?(?:εταιρει|eteri|etairi|πλοιοκτητ|ploiokt|κοινοπραξ|koinoprax)/.test(combined)
        ) return 'companyContacts';

        /* Πόσα πλοία/καράβια εξυπηρετούν τη γραμμή = Στοιχεία Πλοίων. */
        if (
            /(?:ποσα|posa)\s+(?:καραβια|πλοια|ferry(?:\s+boat)?s?|karavia|ploia).*?(?:κανουν\s+δρομολογια|υπαρχουν|εξυπηρετουν|kanoun\s+dromologia|uparxoun|eksipiretoun)/.test(combined) ||
            /(?:ποσα|posa)\s+(?:καραβια|πλοια|ferry(?:\s+boat)?s?|karavia|ploia)\s+(?:στη|στην|stin)\s+(?:γραμμη|porthmeio|πορθμειο|grammi)/.test(combined)
        ) return 'shipsDetails';

        /* «Πότε θα...» για έναρξη/εκτέλεση = μελλοντική πληροφορία, όχι status. */
        if (
            /(?:ποτε|pote|τι\s+ωρα|ti\s+ora).*?(?:θα\s+|tha\s+).*?(?:κανουν|kanoun|εκτελουν|ekteloun|ξεκινησουν|xekinisoun|ξαναρχισουν|xanarxisoun|επαναλειτουργ|epanaleitourg).*?(?:δρομολογια|dromologia|καραβια|πλοια|karavia|ploia)/.test(combined) ||
            /(?:ποτε|pote).*?(?:καραβια|πλοια|karavia|ploia).*?(?:θα\s+|tha\s+).*?(?:κανουν|kanoun).*?(?:δρομολογια|dromologia)/.test(combined)
        ) return 'futureScheduleInfo';

        /* Αύριο/μεθαύριο + εκτέλεση/ύπαρξη δρομολογίων = μελλοντική πληροφορία. */
        if (
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio).*?(?:θα\s+|tha\s+)?(?:εκτελουνται|εκτελουντε|ektelountai|ektelounte|γινονται|ginontai|υπαρχουν|uparxoun|εχει|exei).*?(?:δρομολογια|dromologia)/.test(combined) ||
            /(?:δρομολογια|dromologia).*?(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio).*?(?:θα\s+|tha\s+)?(?:εκτελουνται|εκτελουντε|ektelountai|ektelounte|γινονται|ginontai|υπαρχουν|uparxoun|εχει|exei)/.test(combined)
        ) return 'futureScheduleInfo';

        /* Γενικό «αυριανά δρομολόγια / πρόγραμμα αύριο». */
        if (
            /^(?:αυριανα|auriana|avriana)\s+(?:δρομολογια|dromologia)$/.test(raw) ||
            /^(?:δρομολογια|dromologia|προγραμμα|programma)\s+(?:αυριο|aurio|avrio)$/.test(raw) ||
            /^(?:αυριο|aurio|avrio)\s+(?:τι\s+|ti\s+)?(?:δρομολογια|dromologia)(?:\s+(?:εχει|exei))?$/.test(raw)
        ) return 'futureScheduleInfo';

        /* Χρόνος πραγματικής θαλάσσιας διέλευσης. */
        if (
            /(?:ποσα|posa)\s+(?:λεπτα|lepta).*?(?:θελει|thelei).*?(?:περασει|περασω|perasei|peraso).*?(?:απεναντι|apenanti|apananti)/.test(combined) ||
            /(?:ποσο|poso).*?(?:θελει|χρειαζεται|thelei|xreiazetai).*?(?:περασει|περασω|παει|perasei|peraso|paei).*?(?:απεναντι|apenanti|apananti)/.test(combined) ||
            /(?:χρονοσ|διαρκεια|xronos|diarkeia).*?(?:διελευσησ|διαδρομησ|dieleusis|diadromis).*?(?:ριο|αντιρριο|rio|antirrio)?/.test(combined)
        ) return 'tripDuration';

        /* Ferry/boat ως ερώτηση λειτουργίας — μόνο χωρίς χρονικό αίτημα. */
        const hasDepartureTimeCue = /(?:ποτε|pote|τι\s+ωρα|ti\s+ora|επομεν|epomen|μετα\s+τι|meta\s+ti|σε\s+ποση\s+ωρα|se\s+posi\s+ora)/.test(combined);
        if (!hasDepartureTimeCue && (
            /^(?:εχει|exei)\s+(?:το\s+|to\s+)?(?:καραβι|πλοιο|ferry(?:\s+boat)?|karavi|ploio)$/.test(raw) ||
            /^(?:περναει|pernaei)\s+(?:το\s+|to\s+)?(?:καραβι|πλοιο|ferry(?:\s+boat)?|karavi|ploio)$/.test(raw) ||
            /^(?:το\s+|to\s+)?(?:ferry(?:\s+boat)?|καραβι|πλοιο|karavi|ploio)\s+(?:εχει|exei)\s+(?:δρομολογια|dromologia)$/.test(raw) ||
            /^(?:τα\s+|ta\s+)?(?:ferry(?:\s+boat)?s?|καραβια|πλοια|karavia|ploia)\s+(?:κανουν|kanoun|εκτελουν|ekteloun|περνανε|pernane|δουλευουν|doulevoun).*?(?:δρομολογια|dromologia)?$/.test(raw)
        )) return 'status';

        /* «Έχει ferry/ferry boat σήμερα;» = σημερινή λειτουργία γραμμής. */
        if (
            /^(?:(?:σημερα|simera)\s+)?(?:εχει|exei|υπαρχει|uparxei)\s+(?:ferry(?:\s+boat)?|καραβι|πλοιο|karavi|ploio)(?:\s+(?:σημερα|simera))?$/.test(raw)
        ) return 'statusToday';

        /* RC1 narrow priority overrides. */

        if (
            /(?:ποσο\s+συχνα|poso\s+sixna|με\s+(?:τι|ποια)\s+συχνοτητα|me\s+(?:ti|poia)\s+sixnotita)/.test(raw) ||
            /(?:καθε\s+ποσο|kathe\s+poso|ανα\s+ποση\s+ωρα|ana\s+posi\s+ora|ανα\s+ποσα\s+λεπτα|ana\s+posa\s+lepta)/.test(raw) ||
            /(?:υπαρχουν|uparxoun)\s+(?:συχνα|sixna)\s+(?:δρομολογια|dromologia)/.test(raw) ||
            /(?:συχνοτητα|sixnotita).*?(?:δρομολογιων|dromologion|καραβι|πλοιο|karavi|ploio)/.test(raw)
        ) return 'frequency';

        if (
            /(?:την\s+επομενη\s+ωρα|tin\s+epomeni\s+ora|μεσα\s+στην\s+ωρα|mesa\s+stin\s+ora|μεσα\s+σε\s+μια\s+ωρα|mesa\s+se\s+mia\s+ora)/.test(raw) ||
            /(?:σε\s+μια\s+ωρα|se\s+mia\s+ora|εντοσ\s+μιασ\s+ωρασ|entos\s+mias\s+oras)/.test(raw) ||
            /(?:στα\s+επομενα\s+60\s+λεπτα|sta\s+epomena\s+60\s+lepta|στο\s+επομενο\s+60λεπτο|sto\s+epomeno\s+60lepto)/.test(raw)
        ) return 'nextHour';

        /*
         * RESTORED LIVE TEST 104
         * Τελευταίες κλειδωμένες οικογένειες πριν από κάθε γενικό scoring.
         */

        /* Final live-test aliases. */
        if (
            /(?:ποτε|pote)\s+(?:θα\s+|tha\s+)?(?:εχει|exei)\s+(?:δρομολογια|dromologia)/.test(raw) ||
            /(?:ποτε|pote|τι\s+ωρα|ti\s+ora)\s+(?:θα\s+|tha\s+)?(?:τελειωσει|teliosei).*?(?:απαγορευτικο|apagoreutiko)/.test(raw) ||
            /(?:ποτε|pote|τι\s+ωρα|ti\s+ora)\s+(?:θα\s+|tha\s+)?(?:ανοιξει|anoixei|anoixi|anoiksei).*?(?:γραμμη|πορθμειο|grammi|porthmeio)/.test(raw) ||
            /(?:ποτε|pote|τι\s+ωρα|ti\s+ora)\s+(?:θα\s+|tha\s+)?(?:ξεκινησουν|xekinisoun).*?(?:δρομολογια|πλοια|καραβια|dromologia|ploia|karavia)/.test(raw)
        ) return 'futureScheduleInfo';

        if (
            /(?:πλοια|ploia).*?(?:εκτελουν|ekteloun).*?(?:κανονικα\s+)?(?:δρομολογια|dromologia)/.test(raw) ||
            /(?:εχει|exei)\s+(?:κανονικα|kanonika)\s+(?:δρομολογια|dromologia)/.test(raw) ||
            /(?:περναει|pernaei)\s+(?:η\s+|i\s+)?(?:γραμμη|grammi)/.test(raw) ||
            /(?:δουλευει|doulevei)\s+(?:το\s+|to\s+)?(?:πορθμειο|porthmeio)/.test(raw) ||
            /(?:δρομολογια|dromologia)\s+(?:ξεκινησαν|xekinisan)/.test(raw)
        ) return 'status';

        /* FUTURE RESTART — «πότε θα ανοίξει/ξεκινήσει» = μελλοντική πληροφορία. */
        if (
            /(?:ποτε|pote)\s+(?:θα\s+|tha\s+)?(?:ανοιξει|anoixi|anoiksei|ξεκινησει|ξεκινησουν|xekinisei|xekinisoun).*?(?:γραμμη|πορθμειο|πλοια|καραβια|δρομολογια|grammi|porthmeio|ploia|karavia|dromologia)/.test(raw) ||
            /(?:ποτε|pote).*?(?:γραμμη|πορθμειο|πλοια|καραβια|δρομολογια|grammi|porthmeio|ploia|karavia|dromologia).*?(?:θα\s+|tha\s+)?(?:ανοιξει|anoixi|anoiksei|ξεκινησει|ξεκινησουν|xekinisei|xekinisoun)/.test(raw)
        ) {
            return 'futureScheduleInfo';
        }

        /* STATUS — επανέναρξη / άρση απαγορευτικού. */
        if (
            /(?:γραμμη|grammi).*?(?:ειχε|eixe).*?(?:κλεισει|klisei).*?(?:τωρα|tora).*?(?:ανοιχτη|anoikti)/.test(raw) ||
            /(?:τελειωσε|teliose).*?(?:απαγορευτικο|apagoreutiko)/.test(raw) ||
            /(?:αρση|arsi).*?(?:απαγορευτικου|apagoreutikou)/.test(raw) ||
            /(?:εγινε|egine).*?(?:αρση|arsi).*?(?:απαγορευτικου|apagoreutikou)/.test(raw) ||
            /(?:γραμμη|πορθμειο|grammi|porthmeio).*?(?:ανοιξε|anoixe|anoikse)/.test(raw) ||
            /(?:ανοιξε|anoixe|anoikse).*?(?:γραμμη|πορθμειο|grammi|porthmeio)/.test(raw) ||
            /(?:ξεκινησαν|xekinisan|ξεκινησε|xekinise).*?(?:δρομολογια|πλοια|καραβια|dromologia|ploia|karavia)/.test(raw) ||
            /(?:γραμμη|πορθμειο|πλοια|καραβια|grammi|porthmeio|ploia|karavia).*?(?:ξεκινησε|ξεκινησαν|xekinise|xekinisan).*?(?:δρομολογια|dromologia)?/.test(raw) ||
            /(?:ειχε|eixe|ηταν|itan).*?(?:κλειστ|kleist|klisei|απαγορευτικ|apagoreutik).*?(?:ανοιξε|anoixe|anoikse|ανοιχτ|anoixt)/.test(raw)
        ) {
            return 'status';
        }

        /* STATUS — εκτέλεση δρομολογίων / κανονική λειτουργία. */
        if (
            /(?:καραβια|πλοια|karavia|ploia).*?(?:κανουν|kanoun)\s+(?:δρομολογια|dromologia)/.test(raw) ||
            /(?:κανουν|kanoun)\s+(?:δρομολογια|dromologia).*?(?:καραβια|πλοια|karavia|ploia)/.test(raw) ||
            /(?:υπαρχουν|uparxoun).*?(?:αυτη\s+τη\s+στιγμη|auti\s+tin\s+stigmi|τωρα|tora)?.*?(?:δρομολογια|dromologia)/.test(raw) ||
            /(?:γινονται|γινοντε|ginontai|ginonte)\s+(?:δρομολογια|dromologia)/.test(raw) ||
            /(?:δρομολογια|dromologia)\s+(?:γινονται|γινοντε|ginontai|ginonte|εκτελουνται|εκτελουντε|ektelountai|ektelounte)/.test(raw) ||
            /(?:εκτελουνται|εκτελουντε|ektelountai|ektelounte)\s+(?:δρομολογια|dromologia)/.test(raw) ||
            /(?:υπαρχουν|uparxoun)\s+(?:δρομολογια|dromologia).*?(?:γραμμη|πορθμειο|grammi|porthmeio)/.test(raw) ||
            /(?:γραμμη|πορθμειο|grammi|porthmeio).*?(?:εχει|exei)\s+(?:δρομολογια|dromologia)/.test(raw) ||
            /(?:εχει|exei)\s+(?:δρομολογια|dromologia).*?(?:γραμμη|πορθμειο|grammi|porthmeio)/.test(raw) ||
            /(?:καραβια|πλοια|karavia|ploia).*?(?:περνανε|pernane)\s+(?:απεναντι|apenanti)/.test(raw) ||
            /(?:καραβια|πλοια|karavia|ploia).*?(?:δουλευουν|doulevoun|λειτουργουν|leitourgoun)\s+(?:κανονικα|kanonika)/.test(raw) ||
            /(?:γραμμη|πορθμειο|grammi|porthmeio).*?(?:δουλευει|doulevei|λειτουργει|leitourgi|leitourgei)\s+(?:κανονικα|kanonika)/.test(raw) ||
            /(?:δρομολογια|dromologia).*?(?:στο\s+|sto\s+)?(?:πορθμειο|porthmeio).*?(?:εκτελουνται|εκτελουντε|ektelountai|ektelounte)\s+(?:κανονικα|kanonika)/.test(raw)
        ) {
            return 'status';
        }

        /* STATUS — διακοπή / παύση λειτουργίας. */
        if (
            /(?:εχουν\s+)?(?:σταματησει|stamatisei|σταματησαν|stamatisan)\s+(?:τα\s+|ta\s+)?(?:δρομολογια|dromologia)/.test(raw) ||
            /(?:διακοπη|diakopi)\s+(?:δρομολογιων|dromologion|domologion)/.test(raw) ||
            /(?:διακοπηκαν|diakopikan|διεκοψαν|diekopsan).*?(?:δρομολογια|dromologia)/.test(raw) ||
            /(?:καραβια|πλοια|karavia|ploia).*?(?:διεκοψαν|diekopsan|σταματησαν|stamatisan).*?(?:δρομολογια|dromologia)/.test(raw) ||
            /(?:γραμμη|πορθμειο|grammi|porthmeio).*?(?:σταματησει|stamatisei|σταματησε|stamatise)/.test(raw) ||
            /(?:εχει|exei)\s+(?:σταματησει|stamatisei).*?(?:γραμμη|πορθμειο|grammi|porthmeio)/.test(raw) ||
            /(?:καραβια|πλοια|πορθμειο|karavia|ploia|porthmeio).*?(?:σταματημενα|stamatimena)/.test(raw)
        ) {
            return 'status';
        }

        if (
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio).*?(?:ανατολικα|anatolika).*?(?:δυτικα|dytika|ditika|dutika)/.test(raw) ||
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio).*?(?:δυτικα|dytika|ditika|dutika).*?(?:ανατολικα|anatolika)/.test(raw) ||
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio).*?(?:σε\s+)?(?:ποιεσ|ποιες|poies|ποια|poia)\s+(?:προβλητεσ|προβλητες|provlites|προβλητα|provlita).*?(?:θα\s+|tha\s+)?(?:δουλευουν|doulevoun|ειναι|einai|φευγουν|feugoun)/.test(raw) ||
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio).*?(?:απο|apo)\s+(?:ποια|poia|ποιεσ|ποιες|poies)\s+(?:προβλητα|προβλητεσ|προβλητες|provlita|provlites).*?(?:θα\s+|tha\s+)?(?:φευγουν|feugoun|δουλευουν|doulevoun)/.test(raw)
        ) return 'vesselPosition';

        if (
            /(?:εφαρμογη|efarmogi|egarmogi|app).*?(?:κινητο|kinito|εγκατασταση|egkatastasi|egatastasi|αρχικη|arxiki|οθονη|othoni)/.test(raw) ||
            /(?:εγκατασταση|egkatastasi|egatastasi|install).*?(?:εφαρμογη|efarmogi|egarmogi|app)/.test(raw) ||
            /(?:θελω|thelo|βαλω|valo|βαζω|vazo|προσθετω|prostheto|porstheto).*?(?:εφαρμογη|efarmogi|egarmogi|app).*?(?:κινητο|kinito|αρχικη|arxiki)/.test(raw) ||
            /(?:οδηγιεσ|οδηγιες|odigies).*?(?:εγκατασταση|egkatastasi|egatastasi|εφαρμογη|efarmogi|egarmogi)/.test(raw)
        ) return 'install';

        if (
            /(?:σημερα|simera).*?(?:πλοια|καραβια|ploia|karavia).*?(?:περνανε|pernane|πηγαινουν|pigenoun|κανουν|kanoun|εκτελουν|ekteloun).*?(?:απεναντι|apenanti|δρομολογια|dromologia)/.test(raw) ||
            /(?:σημερα|simera).*?(?:υπαρχουν|uparxoun)\s+(?:δρομολογια|dromologia)/.test(raw) ||
            /(?:σημερα|simera).*?(?:πορθμειο|porthmeio|γραμμη|grammi).*?(?:ειναι\s+ανοιχτ|einai\s+anoixt|λειτουργει|leitourgi|leitourgei|δουλευει|douleuei|doulevei)/.test(raw) ||
            /(?:πορθμειο|porthmeio|γραμμη|grammi).*?(?:σημερα|simera).*?(?:ειναι\s+ανοιχτ|einai\s+anoixt|λειτουργει|leitourgi|leitourgei|δουλευει|douleuei|doulevei)/.test(raw)
        ) return 'statusToday';

        if (
            /^(?:το\s+|to\s+)?(?:πορθμειο|porthmeio)\s+(?:δουλευει|douleuei|doulevei|λειτουργει|leitourgi|leitourgei)$/.test(raw) ||
            /^(?:η\s+|i\s+)?(?:γραμμη|grammi)\s+(?:δουλευει|douleuei|doulevei|λειτουργει|leitourgi|leitourgei)$/.test(raw) ||
            /^(?:τα\s+|ta\s+)?(?:πλοια|καραβια|ploia|karavia)\s+(?:δουλευουν|doulevoun|λειτουργουν|leitourgoun)$/.test(raw)
        ) return 'status';

        if (
            /^(?:ποτε|pote)\s+(?:πληρωνω|plirono)$/.test(raw) ||
            /(?:πλοια|καραβια|ploia|karavia).*?(?:μηχανημα|mixanima)\s+pos/.test(raw) ||
            /(?:που|πωσ|πως|pou|pos)\s+(?:βγαζω|vgazo|κοβω|kovo)\s+(?:εισιτηριο|εισιτηρια|eisitirio|eisitiria|isiterio|isiteria)/.test(raw) ||
            /(?:ποτε|pote)\s+(?:κοβω|κοβει|kovo|kovi)\s+(?:εισιτηριο|εισιτηρια|eisitirio|eisitiria|isiterio|isiteria)/.test(raw) ||
            /(?:που|pou)\s+(?:κοβουν|kovoun)\s+(?:εισιτηρια|eisitiria|isiteria)/.test(raw) ||
            /(?:υπαρχουν|uparxoun)\s+(?:εκδοτηρια|ekdotiria)/.test(raw) ||
            /(?:εκδοτηρια|ekdotiria).*?(?:που|pou).*?(?:υπαρχουν|uparxoun)/.test(raw) ||
            /(?:μπορω|mporo)\s+(?:να\s+|na\s+)?(?:πληρωσω|pliroso)\s+(?:μεσα\s+|mesa\s+)(?:στο\s+|sto\s+)?(?:πλοιο|καραβι|ploio|karavi)/.test(raw)
        ) return 'payment';

        if (
            /(?:χριστουγεννα|χριστουγενα|xristougenna|xrisotugenna|xristugenna|xristougena|xristogena|christougenna|christmas|πρωτοχρονια|protoxronia|protochronia|newyear|πασχα|pasxa|pascha|easter)/.test(raw)
        ) return 'holidayOperation';

        /*
         * RESTORED LIVE TEST 103
         * Κλειδωμένες οικογένειες πριν από το παλιό scoring.
         */

        /* Σύντομο «επόμενο από Ρίο/Αντίρριο». */
        if (
            /^(?:επομενο|epomeno)\s+(?:απο|apo)\s+(?:ριο|rio|αντιρριο|αντιριο|antirrio|antirio|antiriro)$/.test(raw)
        ) {
            return 'next';
        }

        /* Σκέτο «δρομολόγια» = πλήρες πρόγραμμα. */
        if (/^(?:δρομολογια|dromologia)$/.test(raw)) {
            return 'schedule';
        }

        /* Σε πόση ώρα φεύγει από συγκεκριμένο λιμάνι. */
        if (
            /^(?:σε\s+|se\s+)?(?:ποση|posi)\s+(?:ωρα|ora)\s+(?:φευγει|αναχωρει|feugei|anaxorei)\s+(?:απο|apo)\s+(?:ριο|rio|αντιρριο|αντιριο|antirrio|antirio|antiriro)$/.test(raw)
        ) {
            return 'next';
        }

        /* Μετά από συγκεκριμένη ώρα, με ή χωρίς τη λέξη δρομολόγιο. */
        if (
            /(?:μετα|meta)\s+(?:τις|tis)?\s*\d{1,2}(?::\d{2})?.*?(?:ποτε|pote).*?(?:εχει|exei)\s+(?:καραβι|πλοιο|karavi|ploio).*?(?:απο|apo)\s+(?:ριο|rio|αντιρριο|αντιριο|antirrio|antirio|antiriro)/.test(raw) ||
            /(?:ποτε|pote).*?(?:εχει|exei)\s+(?:καραβι|πλοιο|karavi|ploio).*?(?:μετα|meta)\s+(?:τις|tis)?\s*\d{1,2}(?::\d{2})?.*?(?:απο|apo)\s+(?:ριο|rio|αντιρριο|αντιριο|antirrio|antirio|antiriro)/.test(raw)
        ) {
            return 'next';
        }

        /* Αύριο + μέρος ημέρας + πότε έχει καράβι = χρονικό πρόγραμμα. */
        if (
            /(?:αυριο|aurio|avrio).*?(?:πρωι|μεσημερι|απογευμα|βραδυ|proi|mesimeri|apogeuma|vradi).*?(?:ποτε|pote).*?(?:εχει|exei)\s+(?:καραβι|πλοιο|karavi|ploio)/.test(raw)
        ) {
            return 'next';
        }

        /* Νέα κλειδωμένα GPS / διάρκεια / μελλοντική λειτουργία. */
        if (
            /(?:ποσο|poso)\s+(?:θελω|thelo)\s+(?:για|gia)\s+(?:το\s+|to\s+)?(?:ριο|αντιρριο|rio|antirrio)/.test(raw)
        ) {
            return 'distanceGps';
        }

        if (
            /(?:ποσο|poso)\s+(?:θελει|thelei|κανει|kanei)\s+(?:για\s+|gia\s+)?(?:να\s+|na\s+)?(?:περασει|perasei)\s+(?:απεναντι|apenanti)/.test(raw)
        ) {
            return 'tripDuration';
        }

        if (
            /(?:αυριο|aurio|avrio).*?(?:θα\s+|tha\s+)?(?:δουλευουν|doulevoun)\s+(?:τα\s+|ta\s+)?(?:καραβια|πλοια|karavia|ploia)/.test(raw)
        ) {
            return 'futureScheduleInfo';
        }

        /* LIVE TEST 101 — κλειδωμένοι κανόνες πριν από το γενικό scoring. */

        if (
            /^(?:ε\s+|e\s+)?(?:σε\s+|se\s+)?(?:ποση|posi)\s+(?:ωρα|ora)\s+(?:θα\s+|tha\s+)?(?:ειμαι|eimai)\s+(?:στο|στην|sto|stin)\s+(?:ριο|αντιρριο|προβλητα|rio|antirrio|provlita)$/.test(raw) ||
            /^(?:ποτε|pote)\s+(?:θα\s+|tha\s+)?(?:ειμαι|eimai)\s+(?:στο|στην|sto|stin)\s+(?:ριο|αντιρριο|προβλητα|rio|antirrio|provlita)$/.test(raw)
        ) {
            return 'distanceGps';
        }

        if (
            /^(?:χρονοσ|χρονος|xronos)\s+(?:διελευσησ|διελευσης|διαδρομησ|διαδρομης|dieleusis|dielefsis|diadromis)$/.test(raw) ||
            /^(?:ποση|posi)\s+(?:ωρα|ora)\s+(?:κανει|kanei)\s+(?:να\s+|na\s+)?(?:περασει|perasei)$/.test(raw)
        ) {
            return 'tripDuration';
        }

        if (
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio).*?(?:που|pou)\s+(?:θα\s+|tha\s+)?(?:δουλευουν|doulevoun)\s+(?:τα\s+|ta\s+)?(?:πλοια|καραβια|ploia|karavia)/.test(raw) ||
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio).*?(?:ανατολικα|anatolika).*?(?:δυτικα|dytika|ditika|dutika)/.test(raw)
        ) {
            return 'vesselPosition';
        }

        if (
            /^pos\s+(?:εχουν|exoun)\s+(?:τα\s+|ta\s+)?(?:πλοια|καραβια|ploia|karavia)$/.test(raw) ||
            /^(?:εχουν|exoun)\s+pos\s+(?:τα\s+|ta\s+)?(?:πλοια|καραβια|ploia|karavia)$/.test(raw)
        ) {
            return 'payment';
        }

        if (
            /(?:δρομολογια|dromologia)\s+(?:τησ|της|tis)\s+(?:επομενησ|επομενης|epomenis)\s+(?:ωρασ|ωρας|oras)/.test(raw) ||
            /(?:δρομολογια|dromologia)\s+(?:επομενησ|επομενης|epomenis)\s+(?:ωρασ|ωρας|oras)/.test(raw) ||
            /(?:δρομολογια|dromologia)\s+(?:μεσα\s+)?(?:στην|stin)\s+(?:επομενη|epomeni)\s+(?:ωρα|ora)/.test(raw) ||
            /(?:επομενη|epomeni)\s+(?:ωρα|ora)\s+(?:δρομολογια|dromologia)/.test(raw) ||
            /(?:μεσα\s+)?(?:στην|stin)\s+(?:επομενη|epomeni)\s+(?:ωρα|ora).*?(?:δρομολογια|dromologia|καραβι|πλοιο|karavi|ploio)/.test(raw)
        ) {
            return 'nextHour';
        }

        if (
            /(?:σημερα|αυριο|simera|aurio|avrio).*?(?:πρωι|μεσημερι|απογευμα|βραδυ|proi|mesimeri|apogeuma|vradi).*?(?:μετα|meta)\s+(?:τις|τισ|tis)?\s*\d{1,2}(?::\d{2})?.*?(?:απο|apo)\s+(?:ριο|αντιρριο|rio|antirrio)/.test(raw)
        ) {
            return 'next';
        }

        const hasFutureDay =
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio)/.test(combined);
        const hasDayPart =
            /(?:πρωι|μεσημερι|απογευμα|βραδυ|νυχτα|proi|mesimeri|apogeuma|vradi|nyxta)/.test(combined);
        const hasNumericTime = parseRequestedHour(text) !== null;

        /* Κλειδωμένες πλήρεις φράσεις υψηλής προτεραιότητας. */
        if (/(?:ποση|posi)\s+(?:ωρα|ora)\s+(?:κανει|kanei)\s+(?:να|na)\s+(?:περασει|perasei)/.test(combined)) {
            return 'tripDuration';
        }

        if (/(?:τι|ti)\s+(?:ωρα|ora)\s+(?:σταματανε|σταματουν|stamatane|stamatoun)(?:.*?)(?:καραβια|πλοια|δρομολογια|karavia|ploia|dromologia)/.test(combined) ||
            /(?:μεχρι|mexri)\s+(?:τι|ti)\s+(?:ωρα|ora).*?(?:καραβι|πλοιο|δρομολογια|karavi|ploio|dromologia)/.test(combined) ||
            /(?:ολο|olo)\s+(?:το\s+)?(?:βραδυ|vradi|24ωρο|24oro)/.test(combined)) {
            return 'continuousOperation';
        }

        if (/(?:τι|ti)\s+(?:ξερεις|xereis|ksereis)\s+(?:για|gia)\s+(?:την|tin)\s+(?:ιστορια|istoria)\s+(?:της|tis)\s+(?:γραμμης|grammis)/.test(combined)) {
            return 'history';
        }

        if (/(?:τι|ti)\s+(?:ξερεις|γνωριζεις|γνωριζεισ|xereis|ksereis|gnorizeis)\s+(?:για|gia)\s+(?:το|to)\s+(?:πορθμειο|porthmeio)/.test(combined)) {
            return 'assistantCapabilities';
        }

        if (/(?:ποσ|pos)\s+(?:εχουν|exoun)\s+(?:τα\s+|ta\s+)?(?:καραβια|karavia)/.test(raw)) {
            return 'status';
        }

        if (/(?:σημερα|simera|sinera)/.test(combined) &&
            /(?:δουλευουν|λειτουργουν|εκτελουνται|doulevoun|leitourgoun|ektelountai)/.test(combined) &&
            /(?:καραβια|πλοια|δρομολογια|karavia|ploia|dromologia)/.test(combined)) {
            return 'statusToday';
        }

        if (hasFutureDay && hasDayPart &&
            /(?:που|pou)\s+(?:θα\s+|tha\s+)?(?:δουλευουν|doulevoun)\s+(?:τα\s+|ta\s+)?(?:καραβια|πλοια|karavia|ploia)/.test(combined)) {
            return 'futureScheduleInfo';
        }

        if (hasNumericTime &&
            /(?:μετα|meta|πριν|prin|μεχρι|mexri|εως|eos)/.test(combined) &&
            /(?:δρομολογιο|δρομολογια|καραβι|πλοιο|dromologio|dromologia|karavi|ploio)/.test(combined)) {
            return 'next';
        }

        if (/(?:επομενο|epomeno)\s+(?:δρομολογιο|καραβι|πλοιο|dromologio|karavi|ploio)/.test(combined)) {
            return 'next';
        }

        if (/(?:επομενη|epomeni)\s+(?:ωρα|ora)/.test(combined) ||
            /(?:μεσα|mesa)\s+(?:στην|stin)\s+(?:επομενη|epomeni)\s+(?:ωρα|ora)/.test(combined) ||
            /(?:μεσα|mesa)\s+(?:στην|stin)\s+(?:ωρα|ora).*?(?:φευγει|feugei)/.test(combined)) {
            return 'nextHour';
        }

        if (/(?:επομενα|epomena)\s*(?:3|τρια|tria)/.test(combined) ||
            /(?:3|τρια|tria)\s+(?:επομενα|epomena)/.test(combined)) {
            return 'next3';
        }

        /*
         * Απόλυτες διακρίσεις για τις σύντομες καθημερινές ερωτήσεις.
         * Ελέγχονται πριν από κάθε γενικό scoring.
         */

        /* «Πώς πάω Ρίο/Αντίρριο;» — το pos σημαίνει πώς, όχι POS. */
        if (
            /^(?:πως|πωσ|pos)\s+(?:παω|πηγαινω|πηγαινο|φτανω|pao|pigeno|pigaino|ftano)\s+(?:στο|στον|προσ|sto|pros)?\s*(?:το\s+)?(?:ριο|αντιρριο|rio|antirrio|antirio|antiriro)$/.test(raw) ||
            /^(?:πως|πωσ|pos)\s+(?:παω|πηγαινω|πηγαινο|φτανω|pao|pigeno|pigaino|ftano)\s+(?:ριο|αντιρριο|rio|antirrio|antirio|antiriro)$/.test(raw)
        ) {
            return 'navigation';
        }

        /* Ελλειπτική ερώτηση προβλήτας = Θέση Πλοίων, όχι πλοήγηση. */
        if (
            /^(?:σε|απο|se|apo)\s+(?:ποια|ποιεσ|ποιες|poia|poies)\s+(?:προβλητα|προβλητεσ|provlita|provlites|plrovlita|proivlita|prolvita|plovlita|provlhta|problita)$/.test(raw) ||
            /^(?:ποια|ποιεσ|ποιες|poia|poies)\s+(?:προβλητα|προβλητεσ|provlita|provlites)$/.test(raw)
        ) {
            return 'vesselPosition';
        }

        /* Από πού φεύγουν τα πλοία = προβλήτα αναχώρησης / Θέση Πλοίων. */
        if (
            /^(?:απο\s+που|apo\s+pou)\s+(?:φευγουν|feugoun)\s+(?:τα\s+|ta\s+)?(?:πλοια|καραβια|ploia|karavia)$/.test(raw) ||
            /^(?:που|pou)\s+(?:φευγουν|feugoun)\s+(?:τα\s+|ta\s+)?(?:πλοια|καραβια|ploia|karavia)$/.test(raw)
        ) {
            return 'vesselPosition';
        }

        /* «Έχει καράβι τώρα;» = τρέχουσα λειτουργία OPEN/CLOSE. */
        if (
            /^(?:εχει|exei)\s+(?:καραβι|καραβια|πλοιο|πλοια|karavi|karavia|ploio|ploia)(?:\s+(?:τωρα|tora))?$/.test(raw)
        ) {
            return 'status';
        }

        /*
         * 1. Εορτές: ανεξάρτητη επιχειρησιακή κατηγορία.
         * Ελέγχεται πριν από κάθε γενική μελλοντική ερώτηση.
         */
        if (detectHolidayReference(text)) {
            return 'holidayOperation';
        }

        /* Σύντομη ερώτηση «πού δουλεύουν τώρα;» = Θέση Πλοίων. */
        if (
            /^(?:που|pou)\s+(?:δουλευουν|doulevoun)\s+(?:τα\s+|ta\s+)?(?:πλοια|καραβια|ploia|karavia)(?:\s+(?:τωρα|tora))?$/.test(raw) ||
            /^(?:που|pou)\s+(?:δουλευουν|doulevoun)(?:\s+(?:τωρα|tora))?$/.test(raw)
        ) {
            return 'vesselPosition';
        }

        /*
         * 2. Συγκεκριμένο πλοίο που εργάζεται/φορτώνει τώρα.
         * Η πληροφορία δεν είναι διαθέσιμη από τα live δεδομένα.
         */
        if (
            /(?:ποια|ποιο|poia|poio)\s+(?:πλοια|καραβια|πλοιο|καραβι|ploia|karavia|ploio|karavi)\s+(?:δουλευουν|δουλευει|εκτελουν|εκτελει|doulevoun|douleuei|ekteloun|ektelei)\s+(?:τωρα|tora)/.test(combined) ||
            /(?:ποιο|poio)(?:\s+(?:πλοιο|καραβι|ploio|karavi))?\s+(?:φορτωνει|fortonei)(?:\s+(?:τωρα|tora))?/.test(combined) ||
            /(?:ποιο|poio)(?:\s+(?:πλοιο|καραβι|ploio|karavi))?\s+(?:ειναι|einai)\s+(?:(?:τωρα|tora)\s+)?(?:στη|στην|sti|stin)\s+(?:προβλητα|provlita)/.test(combined)
        ) {
            return 'assignedVesselUnavailable';
        }

        /*
         * 3. Θέση Πλοίων / προβλήτα / πλευρά.
         * Το «πού δουλεύουν» αφορά τα πλοία και υπερισχύει του OPEN/CLOSE.
         * Η ίδια κατηγορία καλύπτει και μελλοντικές ερωτήσεις προβλήτας.
         */
        if (
            /(?:που|pou)\s+(?:θα\s+)?(?:δουλευουν|βρισκονται|ειναι|doulevoun|vriskontai|einai)(?:\s+(?:τωρα|tora))?\s+(?:τα\s+)?(?:πλοια|καραβια|ploia|karavia)(?:\s+(?:τωρα|tora))?/.test(combined) ||
            /(?:που|pou)\s+(?:δουλευουν|βρισκονται|doulevoun|vriskontai)(?:\s+(?:τωρα|tora))?$/.test(combined) ||
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio).*?(?:πλοια|καραβια|ploia|karavia).*?(?:δουλευουν|doulevoun).*?(?:ανατολικα|anatolika).*?(?:δυτικα|dytika|ditika|dutika)/.test(raw + ' ' + combined) ||
            /(?:ανατολικα|anatolika)\s+(?:η|i)\s+(?:δυτικα|dytika|ditika|dutika)/.test(raw + ' ' + combined) ||

            /(?:σε|απο|se|apo)\s+(?:ποια|ποιεσ|ποιες|poia|poies)\s+(?:προβλητα|provlita|plrovlita|proivlita|prolvita|plovlita|provlhta|problita)\s+(?:θα\s+|tha\s+)?(?:δουλευουν|φευγουν|ειναι|βρισκονται|λειτουργουν|doulevoun|feugoun|einai|vriskontai|leitourgoun)(?:\s+(?:τα\s+)?(?:πλοια|καραβια|ploia|karavia))?/.test(raw + ' ' + combined) ||
            /(?:απο\s+)?(?:ποια|poia)\s+(?:πλευρα|pleura)\s+(?:δουλευουν|φευγουν|doulevoun|feugoun)/.test(combined) ||
            /(?:ανατολικα|δυτικα|anatolika|dytika|ditika)\s+(?:η|i)\s+(?:δυτικα|ανατολικα|dytika|ditika|anatolika)/.test(combined) ||
            /(?:θεση|κινηση|thesi|kinisi)\s+(?:πλοιων|πλοια|ploion|ploia)/.test(combined)
        ) {
            return 'vesselPosition';
        }

        /*
         * 4. GPS: απόσταση, άφιξη ή αν προλαβαίνει ο χρήστης.
         */
        if (
            /(?:ποσο|poso)\s+(?:κοντα|μακρια|konta|makria|makrua)\s+(?:ειμαι|eimai)/.test(combined) ||
            /(?:ποσο|poso)\s+(?:απεχω|apexo)/.test(combined) ||
            /(?:ποτε|pote)\s+(?:θα\s+)?(?:φτανω|φτασω|ftano|ftaso|frano)\s+(?:στο|στην|sto|stin)\s+(?:ριο|αντιρριο|προβλητα|rio|antirrio|provlita)/.test(raw + ' ' + combined) ||
            /(?:σε\s+ποση\s+ωρα|se\s+posi\s+ora)\s+(?:θα\s+)?(?:ειμαι|φτανω|eimai|ftano|frano)\s+(?:στο|στην|sto|stin)\s+(?:ριο|αντιρριο|προβλητα|rio|antirrio|provlita)/.test(raw + ' ' + combined) ||
            /(?:προλαβαινω|προλαβω|prolavaino|prolaveno|provaleno|prolavo)\s+(?:(?:το|to)\s+)?(?:πλοιο|καραβι|ploio|karavi)/.test(raw + ' ' + combined)
        ) {
            return 'distanceGps';
        }

        /*
         * 5. Μελλοντική λειτουργία/δρομολόγια.
         * Δεν χρησιμοποιεί ποτέ το σημερινό OPEN/CLOSE.
         * Οι εορτές και η μελλοντική προβλήτα έχουν ήδη εξαιρεθεί.
         */
        if (
            hasFutureDay && !hasNumericTime &&
            /(?:γραμμη|πορθμειο|grammi|porthmeio|δρομολογια|καραβι|πλοιο|dromologia|karavi|ploio)/.test(combined) &&
            /(?:θα\s+)?(?:λειτουργει|λειτουργησει|ανοιγει|κλεινει|ειναι\s+ανοιχτ|ειναι\s+κλειστ|εχει|εκτελουνται|leitourgei|leitourgi|leitourgisei|anoigei|klinei|kleinei|einai\s+anoixt|einai\s+kleist|exei|ektelountai)/.test(combined)
        ) {
            return 'futureScheduleInfo';
        }

        /*
         * 6. Πληρωμή / έκδοση εισιτηρίου.
         * Το POS αναγνωρίζεται μόνο μέσα σε σαφές πλαίσιο πληρωμής.
         */
        if (
            /(?:που|pou)\s+(?:κοβω|βγαζω|εκδιδω|αγοραζω|πληρωνω|kovo|vgazo|ekdido|agorazo|plirono)\s+(?:το\s+)?(?:εισιτηριο|eisitirio|isiterio)/.test(combined) ||
            /(?:εχουν|εχει|exoun|exei)\s+pos\b(?:\s+(?:τα\s+)?(?:καραβια|πλοια|karavia|ploia))?/.test(raw) ||
            /(?:τα\s+)?(?:καραβια|πλοια|karavia|ploia)\s+(?:εχουν|exoun)\s+pos\b/.test(raw) ||
            /(?:μπορω|mporo)\s+(?:να\s+)?(?:πληρωσω|pliroso)\s+(?:με\s+)?(?:pos|καρτα|karta)/.test(raw + ' ' + combined) ||
            /(?:δεχονται|dexontai)\s+(?:καρτα|karta)/.test(combined)
        ) {
            return 'payment';
        }

        /*
         * 7. Γενική τρέχουσα λειτουργία OPEN/CLOSE.
         */
        if (
            /^(?:εχει|exei)\s+(?:καραβι|καραβια|πλοιο|πλοια|karavi|karavia|ploio|ploia)$/.test(raw.trim()) ||
            /^(?:εχει|exei)\s+(?:καραβι|καραβια|πλοιο|πλοια|karavi|karavia|ploio|ploia)$/.test(normalized.trim()) ||
            /(?:doulevoun|leitourgoun|pernane)\s+(?:tora\s+)?(?:ta\s+)?(?:karavia|ploia)/.test(raw) ||
            /(?:δουλευουν|λειτουργουν|περνανε)\s+(?:τωρα\s+)?(?:τα\s+)?(?:καραβια|πλοια)/.test(normalized) ||
            /(?:γινονται|εκτελουνται|ginontai|ektelountai)\s+(?:τωρα\s+)?(?:δρομολογια|dromologia)/.test(combined)
        ) {
            return 'status';
        }

        /*
         * 8. Μέρος ημέρας + δρομολόγια = συχνότητα αντίστοιχης βάρδιας.
         */
        if (
            hasDayPart &&
            !hasNumericTime &&
            /(?:δρομολογιο|δρομολογια|καραβι|πλοιο|dromologio|dromologia|karavi|ploio)/.test(combined) &&
            /(?:εχει|θα\s+εχει|φευγει|ξεκινα|ξεκινανε|αρχιζουν|εκτελουνται|exei|tha\s+exei|feugei|xekina|xekinane|arxizoun|ektelountai|τι\s+ωρα|ποτε|ti\s+ora|pote)/.test(combined)
        ) {
            return 'frequency';
        }

        /*
         * 9. Ώρα ανοίγματος/κλεισίματος και 24ωρη λειτουργία.
         * Μελλοντική ημέρα έχει ήδη δρομολογηθεί στο futureScheduleInfo.
         */
        if (
            /(?:τι\s+ωρα|ποτε|ti\s+ora|pote)\s+(?:ανοιγει|κλεινει|σταματανε|σταματουν|anoigei|klinei|kleinei|stamatane|stamatoun)(?:\s+(?:η|το|i|to))?\s*(?:γραμμη|πορθμειο|grammi|porthmeio)?/.test(combined) ||
            /(?:ανοιγει|κλεινει|anoigei|klinei|kleinei)\s+(?:το\s+)?(?:πρωι|βραδυ|αποψε|proi|vradi|apopse)/.test(combined) ||
            /(?:ολο|olo)\s+(?:το\s+)?(?:24ωρο|24oro)/.test(combined) ||
            /24\s*\/\s*7/.test(combined)
        ) {
            return 'continuousOperation';
        }

        return null;
    }

    function detectPriorityIntent(text, raw, normalized, combined) {
        const lockedIntent = detectLockedIntent(text, raw, normalized, combined);
        if (lockedIntent) return lockedIntent;

        const hasNumericTime = parseRequestedHour(text) !== null;
        const hasFutureDay =
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio)/.test(combined);
        const hasDayPart =
            /(?:πρωι|μεσημερι|απογευμα|βραδυ|νυχτα|proi|mesimeri|apogeuma|vradi|nyxta)/.test(combined);
        const hasShipSubject =
            /(?:καραβι|καραβια|πλοιο|πλοια|karavi|karavia|ploio|ploia)/.test(combined);
        const hasPierWord =
            /(?:προβλητα|provlita|plrovlita|proivlita|prolvita|plovlita|provlhta|problita)/.test(raw + ' ' + combined);

        /*
         * Ακριβείς κανόνες raw Greeklish πριν από την κανονικοποίηση.
         * Καλύπτουν συχνά ορθογραφικά λάθη χωρίς να επηρεάζουν άλλες κατηγορίες.
         */
        if (
            /poia\s+(?:provlita|plrovlita|proivlita|prolvita|plovlita|provlhta|problita)\s+(?:doulevei|leitourgei)/.test(raw)
        ) {
            return 'vesselPosition';
        }

        if (
            /se\s+posi\s+ora\s+(?:tha\s+)?(?:eimai|ftano)\s+(?:sto|stin)\s+(?:rio|antirrio|provlita)/.test(raw)
        ) {
            return 'distanceGps';
        }

        if (
            /ti\s+ora\s+(?:stamatane|stamatoun)\s+(?:ta\s+)?(?:karavia|ploia|dromologia)/.test(raw)
        ) {
            return 'continuousOperation';
        }

        if (
            /(?:to\s+)?(?:proi|mesimeri|apogeuma|vradi|nyxta).*?(?:porthmeio|grammi).*?(?:tha\s+)?(?:einai|meinei|paraminei)\s+(?:anoixto|anoixti|kleisto|kleisti)/.test(raw)
        ) {
            return 'statusToday';
        }

        if (
            /(?:ποια|ποιο|poia|poio)\s+(?:πλοια|καραβια|πλοιο|καραβι|ploia|karavia|ploio|karavi)\s+(?:δουλευουν|δουλευει|εκτελουν|εκτελει|doulevoun|douleuei|ekteloun|ektelei)\s+(?:τωρα|tora)/.test(combined) ||
            /(?:ποιο|poio)(?:\s+(?:πλοιο|καραβι|ploio|karavi))?\s+(?:φορτωνει|fortonei)(?:\s+(?:τωρα|tora))?/.test(combined) ||
            /(?:ποιο|poio)(?:\s+(?:πλοιο|καραβι|ploio|karavi))?\s+(?:ειναι|einai)\s+(?:(?:τωρα|tora)\s+)?(?:στη|στην|sti|stin)\s+(?:προβλητα|provlita)/.test(combined) ||
            /(?:ποιο|poia|poio|poia)\s+(?:πλοιο|καραβι|ploio|karavi)\s+(?:φευγει|αναχωρει|feugei|anaxorei)/.test(combined) ||
            /(?:ποιο|poio)\s+(?:φευγει|αναχωρει|feugei|anaxorei)\s+(?:τωρα\s+)?(?:απο|apo)\s+(?:το\s+)?(?:ριο|αντιρριο|rio|antirrio|antirio|antiriro)/.test(combined)
        ) {
            return 'assignedVesselUnavailable';
        }

        if (
            (
                hasShipSubject &&
                hasPierWord &&
                /(?:σε\s+)?(?:ποια|ποιεσ|ποιες|poia|poies)\s+/.test(combined) &&
                /(?:ειναι|βρισκονται|δουλευουν|λειτουργουν|einai|vriskontai|doulevoun|leitourgoun)/.test(combined)
            ) ||
            /(?:απο\s+)?(?:ποια|poia)\s+(?:πλευρα|pleura)\s+(?:δουλευουν|φευγουν|doulevoun|feugoun)/.test(combined) ||
            /(?:ποια|poia)\s+(?:πλευρα|pleura)(?:\s+(?:δουλευει|douleuei))?/.test(combined) ||
            /(?:ανατολικα|δυτικα|anatolika|dytika)\s+(?:η|i)\s+(?:δυτικα|ανατολικα|dytika|anatolika)/.test(combined) ||
            /(?:ποια|poia)\s+(?:προβλητα|provlita|plrovlita|proivlita|prolvita|plovlita|provlhta|problita)\s+(?:δουλευει|λειτουργει|douleuei|leitourgei)/.test(raw)
        ) {
            return 'vesselPosition';
        }

        if (
            /(?:ποσο|poso)\s+(?:κοντα|konta)\s+(?:ειμαι|eimai)/.test(combined) ||
            /(?:ποσο|poso)\s+(?:μακρια|makria|makrua)\s+(?:ειμαι|eimai)/.test(combined) ||
            /(?:ποσο|poso)\s+(?:απεχω|apexo)/.test(combined) ||
            /(?:ποση|posi)\s+(?:αποσταση|apostasi)/.test(combined) ||
            /(?:σε\s+ποση\s+ωρα|se\s+posi\s+ora)\s+(?:θα\s+)?(?:ειμαι|φτανω|eimai|ftano)\s+(?:στο|στην|sto|stin)\s+(?:ριο|αντιρριο|προβλητα|rio|antirrio|provlita)/.test(combined) ||
            /(?:προλαβαινω|προλαβω|prolavaino|prolaveno|provaleno|prolavo)\s+(?:(?:το|to)\s+)?(?:πλοιο|καραβι|ploio|karavi)/.test(raw + ' ' + combined)
        ) {
            return 'distanceGps';
        }

        if (
            /(?:πως|πωσ|pos)\s+(?:βαζω|εγκαθιστω|vazo|egkathisto)\s+(?:την\s+|tin\s+)?(?:εφαρμογη|efarmogi)/.test(combined) ||
            /(?:add\s+to\s+home\s+screen|install\s+app)/.test(combined)
        ) {
            return 'install';
        }

        if (
            /^(?:τηλεφωνα|τηλεφωνο|τηλ|tilefona|tilefono|til|phone|contact)$/.test(normalized) ||
            /(?:τηλεφωνα|τηλεφωνο|επικοινωνια|tilefona|tilefono|epikoinonia)/.test(combined)
        ) {
            return 'contacts';
        }

        if (
            /(?:που|pou)\s+(?:βγαζω|εκδιδω|αγοραζω|πληρωνω|vgazo|ekdido|agorazo|plirono)\s+(?:το\s+)?(?:εισιτηριο|isiterio|eisitirio)/.test(combined) ||
            /(?:απο\s+που|apo\s+pou)\s+(?:βγαζω|αγοραζω|vgazo|agorazo)\s+(?:το\s+)?(?:εισιτηριο|isiterio|eisitirio)/.test(combined) ||
            /(?:τα\s+)?(?:καραβια|πλοια|karavia|ploia)\s+(?:εχουν|exoun)\s+pos\b/.test(raw) ||
            /(?:εχει|exei)\s+pos\s+(?:στο|sto)\s+(?:καραβι|πλοιο|karavi|ploio)/.test(raw) ||
            /(?:καρτα|μετρητα|karta|metrita)/.test(combined)
        ) {
            return 'payment';
        }

        if (
            /(?:ποσο|poso)\s+(?:χρονο|xrono)\s+(?:θελει|χρειαζεται|κανει|thelei|xreiazetai|kanei)(?:\s+(?:το|to))?\s+(?:πλοιο|καραβι|ploio|karavi)/.test(combined) ||
            /(?:ποση|posi)\s+(?:ωρα|ora)\s+(?:θελει|χρειαζεται|thelei|xreiazetai)\s+(?:(?:για|gia)\s+)?(?:(?:να|na)\s+)?(?:περασει|perasei)(?:\s+(?:απεναντι|apenanti))?/.test(combined) ||
            /(?:ποσο|poso)\s+(?:διαρκει|diarkei)\s+(?:η|i)\s+(?:διαδρομη|διελευση|diadromi|dielefsi)/.test(combined) ||
            /(?:χρονοσ|χρονος|xronos)\s+(?:διελευσησ|διελευσης|dielefsis)/.test(combined)
        ) {
            return 'tripDuration';
        }

        /* Γενική συχνότητα χωρίς μέρος ημέρας. */
        if (
            /(?:συχνοτητα|συχνα|sixnotita|sixna|syxnotita|syxna)/.test(combined) &&
            /(?:δρομολογιο|δρομολογια|καραβι|πλοιο|dromologio|dromologia|karavi|ploio)/.test(combined) ||
            /(?:καθε|kathe)\s+(?:ποτε|ποσο|pote|poso)\s+(?:εχει|φευγει|γινονται|exei|feugei|ginontai)?\s*(?:δρομολογιο|δρομολογια|καραβι|πλοιο|dromologio|dromologia|karavi|ploio)/.test(combined)
        ) {
            return 'frequency';
        }

        if (
            hasFutureDay &&
            hasDayPart &&
            /(?:εχει|θα\s+εχει|υπαρχουν|εκτελουνται|exei|tha\s+exei|yparxoun|ektelountai)/.test(combined) &&
            /(?:δρομολογια|καραβι|πλοιο|dromologia|karavi|ploio)/.test(combined) &&
            !hasNumericTime
        ) {
            return 'futureScheduleInfo';
        }

        if (
            hasDayPart &&
            !hasNumericTime &&
            /(?:δρομολογιο|δρομολογια|καραβι|πλοιο|dromologio|dromologia|karavi|ploio)/.test(combined) &&
            (
                /(?:καθε|kathe)\s+(?:ποτε|ποσο|pote|poso)/.test(combined) ||
                /(?:συχνοτητα|συχνα|sixnotita|sixna|syxnotita|syxna)/.test(combined) ||
                /(?:τι\s+ωρα|τι\s+ωρεσ|τι\s+ωρες|ποιεσ\s+ωρεσ|ποιες\s+ωρες|ti\s+ora|ti\s+ores|poies\s+ores)/.test(combined) ||
                /(?:εχει|υπαρχουν|εκτελουνται|γινονται|exei|yparxoun|ektelountai|ginontai)/.test(combined)
            ) &&
            !/(?:πορθμειο|γραμμη|porthmeio|grammi).*(?:ανοιχτο|ανοιχτη|κλειστο|κλειστη|anoixto|anoixti|kleisto|kleisti)/.test(combined)
        ) {
            return 'frequency';
        }

        if (
            hasDayPart &&
            !hasNumericTime &&
            /(?:πορθμειο|γραμμη|porthmeio|grammi)/.test(combined) &&
            /(?:θα\s+)?(?:ειναι|παραμεινει|tha\s+einai|paraminei)\s+(?:ανοιχτο|ανοιχτη|κλειστο|κλειστη|anoixto|anoixti|kleisto|kleisti)/.test(combined)
        ) {
            return 'statusToday';
        }

        if (
            /(?:τι\s+ωρα|ποτε|ti\s+ora|pote)\s+(?:σταματανε|σταματουν|stamatane|stamatoun)\s+(?:τα\s+)?(?:καραβια|πλοια|δρομολογια|karavia|ploia|dromologia)/.test(combined) ||
            /(?:μεχρι|mexri)\s+(?:τι\s+ωρα|ti\s+ora)\s+(?:εχει|λειτουργει|exei|leitourgei)/.test(combined) ||
            /(?:ολο|olo)\s+(?:το\s+)?(?:24ωρο|24oro)/.test(combined) ||
            /(?:24\s*\/\s*7|24ωρο|24oro)/.test(combined)
        ) {
            return 'continuousOperation';
        }

        if (
            /(?:περνανε|περνουν|pernane|pernoun)\s+(?:τα\s+)?(?:καραβια|πλοια|karavia|ploia)/.test(combined) ||
            /(?:εκτελουνται|γινονται|ektelountai|ginontai)\s+(?:δρομολογια|dromologia)/.test(combined)
        ) {
            return 'status';
        }

        if (
            /(?:χρονοσ|χρονος|ωρα|επομενοσ|επομενος|xronos|ora|epomenos)\s+(?:αποπλου|αποπλους|apoplou|apoplous)/.test(combined) ||
            /(?:αποπλουσ|αποπλους|apoplous)\s+(?:απο|apo)?/.test(combined)
        ) {
            return 'next';
        }

        return null;
    }

    function detectIntent(text) {
        const raw = normalizeRawQuery(text);
        const normalized = normalizeText(text);
        const combined = raw + ' ' + normalized;
        const priorityIntent = detectPriorityIntent(
            text,
            raw,
            normalized,
            combined
        );

        if (priorityIntent) return priorityIntent;

        if (
            detectHolidayReference(text) &&
            /(?:εχει|δουλευει|λειτουργει|δρομολογια|καραβι|πλοιο|exei|douleuei|leitourgei|dromologia|karavi|ploio)/.test(combined)
        ) {
            return 'status';
        }

        /*
         * Αυστηρές προτεραιότητες πριν από όλα τα γενικά intents.
         * Η λέξη «πόσο» δεν αρκεί ποτέ από μόνη της για τιμές.
         */

        const hasWeatherSubject =
            /(?:καιρο|καιρος|θερμοκρασια|αερα|ανεμο|μποφορ|βροχη|προγνωση|φυσαει|kairo|kairos|thermokrasia|aera|anemo|mpofor|mpofort|bofor|bofort|bofr|beaufort|beafort|beufort|bf|wind|vroxi|prognosi|fysaei)/.test(combined);

        const hasFutureWeatherTime =
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio|δευτερα|τριτη|τεταρτη|πεμπτη|παρασκευη|σαββατο|κυριακη|πρωι|μεσημερι|απογευμα|βραδυ|νυχτα|proi|mesimeri|apogeuma|vradi|nyxta)/.test(combined) ||
            /(?:θα|tha)\s+(?:εχει|κανει|φυσαει|βρεξει|exei|kanei|fysaei|vrexei)/.test(combined);

        if (hasWeatherSubject && hasFutureWeatherTime) {
            return 'forecast';
        }

        if (/(?:προγνωση|prognosi|forecast)/.test(combined)) {
            return 'forecast';
        }

        if (hasWeatherSubject) {
            return 'weather';
        }

        /* Απόσταση, χρόνος άφιξης και έλεγχος αν προλαβαίνει το πλοίο. */
        if (
            /(?:ποσο|poso)\s+(?:μακρια|makria|makrua)/.test(combined) ||
            /(?:ποσο|poso)\s+(?:μακρια|makria|makrua)\s+(?:ειμαι|eimai)\s+(?:απο|apo)\s+(?:το\s+)?(?:ριο|αντιρριο|rio|antirrio|antirio|antiriro)/.test(combined) ||
            /(?:ποσο|poso)\s+(?:απεχω|apexo)/.test(combined) ||
            /(?:ποση|posi)\s+(?:αποσταση|apostasi)/.test(combined) ||
            /(?:σε\s+ποση\s+ωρα|se\s+posi\s+ora)\s+(?:φτανω|φτασω|ftano|ftaso|frano)/.test(raw + ' ' + combined) ||
            /(?:ποτε|pote)\s+(?:θα\s+)?(?:φτανω|φτασω|ftano|ftaso|frano)\s+(?:στο|στην|sto|stin)\s+(?:ριο|αντιρριο|προβλητα|rio|antirrio|provlita)/.test(raw + ' ' + combined) ||
            /(?:προλαβαινω|προλαβω|prolavaino|prolavo)\s+(?:(?:το|to)\s+)?(?:πλοιο|καραβι|ploio|karavi)/.test(combined) ||
            /(?:θα\s+φτασω|tha\s+ftaso)\s+(?:εγκαιρα|egkaira|egkairos)/.test(combined) ||
            /(?:προλαβαινω|prolavaino)\s+(?:την\s+)?(?:αναχωρηση|anaxorisi)/.test(combined)
        ) {
            return 'distanceGps';
        }

        /* Προβλήτα εργασίας/αναχώρησης πλοίων — πάντα Θέση Πλοίων. */
        if (
            /(?:σε|απο)\s+(?:ποια|ποιε(?:ς|σ)|poia|poies)\s+(?:προβλητα|προβλητε(?:ς|σ)|provlita|provlites|plrovlita|proivlita|prolvita|plovlita|provlhta|problita)\s+(?:δουλευουν|εργαζονται|ειναι|φευγουν|λειτουργουν|doulevoun|ergazontai|einai|feugoun|leitourgoun)(?:\s+(?:τα\s+)?(?:πλοια|καραβια|ploia|karavia))?/.test(raw + ' ' + combined) ||
            /(?:τα\s+)?(?:πλοια|καραβια|ploia|karavia)\s+(?:σε|απο)\s+(?:ποια|ποιε(?:ς|σ)|poia|poies)\s+(?:προβλητα|προβλητε(?:ς|σ)|provlita|provlites)\s+(?:δουλευουν|εργαζονται|φευγουν|doulevoun|ergazontai|feugoun)/.test(combined)
        ) {
            return 'vesselPosition';
        }

        /* Σαφής ερώτηση πρόσβασης/πλοήγησης προς Ρίο ή Αντίρριο. */
        if (
            /(?:πως|πωσ|pos)\s+(?:πηγαινω|πηγαινο|παω|φτανω|pigeno|pigaino|pao|ftano)\s+(?:στο|στον|προς|sto|pros)\s+(?:το\s+)?(?:ριο|αντιρριο|rio|antirrio|antirio|antiriro)/.test(combined)
        ) {
            return 'navigation';
        }

        /* Ειδικές κατηγορίες οχημάτων. */
        if (
            /(?:τροχοσπιτο|τροχοσπιτα|αυτοκινουμενο|αυτοκινουμενα|ρυμουλκουμενο|τρεϊλερ|τρειλερ|trailer|trokospito|aftokinoumeno|rymoulkoumeno)/.test(combined) ||
            /(?:ιχ|ι\.χ\.|ix)\s+(?:με|me)\s+(?:τρεϊλερ|τρειλερ|trailer)/.test(combined)
        ) {
            return 'specialVehicles';
        }

        /* Επιβάτης χωρίς όχημα — προστασία πριν από τη γενική τιμή Ι.Χ. */
        if (
            /(?:χωρισ|xoris)\s+(?:(?:απο|apo)\s+)?(?:αμαξι|αυτοκινητο|οχημα|amaksi|amaxi|autokinito|aftokinito|oxima)/.test(combined) &&
            /(?:επιβατ|epivat|ποσο|poso|πληρων|pliron|κοστι|kost|τιμη|timi|ναυλο|navlo|δωρεαν|dorean)/.test(combined)
        ) {
            return 'passengerFare';
        }

        /* Σαφής τιμή Ι.Χ. */
        if (
            /(?:ιχ|ι\.χ\.|ix|αυτοκινητο|aftokinito|autokinito|amaksi|amaxi)/.test(combined) &&
            /(?:ποσο|poso|pso|πληρωνει|πληρωνω|κανει|κοστιζει|τιμη|ναυλο|plironei|plirono|kanei|kostizei|timi|navlo)/.test(combined)
        ) {
            return 'prices';
        }

        /* Το όνομα του συγκεκριμένου πλοίου δεν υπάρχει στα διαθέσιμα δεδομένα. */
        if (
            /(?:ποιο|ποια|poio|poia)\s+(?:πλοιο|καραβι|ploio|karavi)\s+(?:φευγει|αναχωρει|κανει|εχει|feugei|anaxorei|kanei|exei)(?:\s+(?:τωρα|σημερα|tora|simera))?/.test(combined) ||
            /(?:ποιο|poio)\s+(?:φευγει|αναχωρει|feugei|anaxorei)\s+(?:τωρα\s+)?(?:απο|apo)\s+(?:το\s+)?(?:ριο|αντιρριο|rio|antirrio|antirio|antiriro)/.test(combined) ||
            /(?:ποιο|poio)\s+(?:πλοιο|καραβι|ploio|karavi)\s+(?:εκτελει|ekteli)\s+(?:το\s+)?(?:δρομολογιο|dromologio)/.test(combined)
        ) {
            return 'assignedVesselUnavailable';
        }

        /* Στοιχεία, αριθμός και ονόματα πλοίων της γραμμής. */
        if (
            /(?:ποσα|ποια|posa|poia)\s+(?:πλοια|καραβια|ploia|karavia)\s+(?:εχει|διαθετει|δουλευουν|εξυπηρετουν|εκτελουν|exei|diathetei|doulevoun|exypiretoun|ekteloun)(?:\s+(?:η|i)\s+(?:γραμμη|grammi))?/.test(combined) ||
            /(?:ποσα|ποια|posa|poia)\s+(?:πλοια|καραβια|ploia|karavia)\s+(?:δουλευουν|βρισκονται|doulevoun|vriskontai)\s+(?:στη|στην|sti)\s+(?:γραμμη|grammi)/.test(combined) ||
            /(?:ποια|poia)\s+(?:πλοια|καραβια|ploia|karavia)\s+(?:εκτελουν|κανουν|ekteloun|kanoun)\s+(?:τα\s+)?(?:δρομολογια|dromologia)/.test(combined)
        ) {
            return 'shipsDetails';
        }

        /* Από πού φεύγουν / ποιο είναι το σημείο αναχώρησης. */
        if (
            /(?:απο\s+που|apo\s+pou)\s+(?:φευγουν|feugoun)\s+(?:τα\s+)?(?:πλοια|καραβια|ploia|karavia)/.test(combined) ||
            /(?:απο\s+ποια|apo\s+poia)\s+(?:προβλητα|provlita)\s+(?:φευγουν|feugoun)/.test(combined) ||
            /(?:που|pou)\s+(?:ειναι|einai)\s+(?:η|i)\s+(?:αναχωρηση|anaxorisi)/.test(combined)
        ) {
            return 'vesselPosition';
        }

        /* Γενική επιβεβαίωση για σημερινό μέρος της ημέρας — χωρίς εμφάνιση ωρών. */
        if (
            /(?:σημερα|simera)/.test(combined) &&
            /(?:πρωι|μεσημερι|απογευμα|βραδυ|νυχτα|proi|mesimeri|apogeuma|vradi|nyxta)/.test(combined) &&
            /(?:εχει|υπαρχουν|εκτελουνται|γινονται|exei|yparxoun|ektelountai|ginontai)/.test(combined) &&
            /(?:δρομολογια|καραβι|καραβια|πλοιο|πλοια|dromologia|karavi|karavia|ploio|ploia)/.test(combined) &&
            !/(?:τι\s+ωρα|ποιες\s+ωρες|δωσε\s+μου|προγραμμα|ti\s+ora|poies\s+ores|dose\s+mou|programma)/.test(combined)
        ) {
            return 'statusToday';
        }

        /* Γενική σημερινή επιβεβαίωση λειτουργίας. */
        if (
            /(?:σημερα|simera)/.test(combined) &&
            /(?:εχει\s+δρομολογια|υπαρχουν\s+δρομολογια|εχει\s+(?:καραβι|καραβια|πλοιο|πλοια)|δουλευουν|exei\s+dromologia|yparxoun\s+dromologia|exei\s+(?:karavi|karavia|ploio|ploia)|doulevoun)/.test(combined) &&
            !/(?:προγραμμα|ωρες|ωραρια|ολα|plires|programma|ores|oraria|ola)/.test(combined)
        ) {
            return 'statusToday';
        }

        /* Επιβεβαίωση ότι τα δρομολόγια εκτελούνται κανονικά. */
        if (
            /(?:τα\s+)?δρομολογια\s+(?:εκτελουνται|γινονται)\s+κανονικα/.test(combined) ||
            /dromologia\s+(?:ektelountai|ginontai)\s+kanonika/.test(combined)
        ) {
            return 'status';
        }

        /* Συχνότητα δρομολογίων. */
        if (
            /(?:συχνοτητα|sixnotita|syxnotita)\s+(?:δρομολογιων|dromologion)/.test(combined) ||
            /(?:ποσο|poso)\s+(?:συχνα|sixna|syxna)\s+(?:εχει|exei)\s+(?:δρομολογιο|καραβι|πλοιο|dromologio|karavi|ploio)/.test(combined) ||
            /(?:καθε|kathe)\s+(?:ποσο|ποσα|ποση|poso|posa|posi)(?:\s+(?:λεπτα|λεπτο|ωρα|lepta|lepto|ora))?\s+(?:εχει|φευγει|περναει|exei|feugei|pernaei)(?:\s+(?:δρομολογιο|καραβι|πλοιο|dromologio|karavi|ploio))?/.test(combined) ||
            /(?:πρωι|απογευμα|βραδυ|νυχτα|proi|apogeuma|vradi|nyxta).*?(?:καθε\s+ποσο|kathe\s+poso|ποσο\s+συχνα|poso\s+syxna)/.test(combined) ||
            /(?:πρωι|απογευμα|βραδυ|νυχτα|proi|apogeuma|vradi|nyxta).*?(?:τι\s+ωρα|ti\s+ora).*?(?:καραβι|πλοιο|δρομολογιο|karavi|ploio|dromologio)/.test(combined)
        ) {
            return 'frequency';
        }

        /* 24ωρη λειτουργία / ώρα λήξης δρομολογίων. */
        if (
            /(?:τι\s+ωρα|ποτε|ti\s+ora|pote)\s+(?:σταματανε|σταματουν|τελειωνουν|stamatane|stamatoun|teleionoun)(?:\s+(?:το\s+)?(?:πρωι|απογευμα|βραδυ|νυχτα|proi|apogeuma|vradi|nyxta))?\s+(?:τα\s+)?(?:δρομολογια|καραβια|πλοια|dromologia|karavia|ploia)/.test(combined) ||
            /(?:μεχρι|εως|mexri|eos)\s+(?:τι\s+ωρα|ti\s+ora)\s+(?:εχει|exei)\s+(?:δρομολογια|καραβι|πλοιο|dromologia|karavi|ploio)/.test(combined) ||
            /(?:ολο|olo)\s+(?:το\s+)?(?:βραδυ|24ωρο|vradi|24oro)/.test(combined) ||
            /(?:24\s*\/\s*7|24ωρο|24oro)/.test(combined)
        ) {
            return 'continuousOperation';
        }

        /* Αύριο + μέρος ημέρας χωρίς ακριβή ώρα: τηλεφωνική επιβεβαίωση. */
        if (
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio)/.test(combined) &&
            /(?:δρομολογιο|δρομολογια|καραβι|πλοιο|φευγει|αναχωρει|dromologio|dromologia|karavi|ploio|feugei|anaxorei)/.test(combined) &&
            /(?:πρωι|μεσημερι|απογευμα|βραδυ|νυχτα|proi|mesimeri|apogeuma|vradi|nyxta)/.test(combined) &&
            parseRequestedHour(text) === null
        ) {
            return 'futureScheduleInfo';
        }

        /* 1. Σαφής διάρκεια διέλευσης — πάντα πριν από επόμενο/τιμές. */
        const explicitCrossingDuration =
            /(?:ποσο|poso)\s+(?:(?:χρονο|xrono)\s+)?(?:κανει|kanei|χρειαζεται|χρειαζετε|xreiazetai|xreiazeze)\s+(?:(?:το\s+)?(?:πλοιο|καραβι|ploio|karavi)\s+)?(?:για\s+)?(?:να\s+)?(?:περασει|perasei)\s+(?:(?:το\s+)?(?:πλοιο|καραβι|ploio|karavi)\s+)?(?:απεναντι|apenanti)/.test(combined) ||
            /(?:ποσο|poso)\s+(?:(?:χρονο|xrono)\s+)?(?:κανει|kanei)\s+(?:(?:το\s+)?(?:πλοιο|καραβι|ploio|karavi)\s+)?(?:για\s+)?(?:να\s+)?(?:παει|paei)\s+(?:απεναντι|apenanti)/.test(combined);

        if (
            explicitCrossingDuration ||
            /(?:ποση|posi)\s+(?:ωρα|ora)\s+(?:θελει|χρειαζεται|thelei|xreiazetai)\s+(?:(?:για|gia)\s+)?(?:(?:να|na)\s+)?(?:περασει|perasei)\s+(?:απεναντι|apenanti)/.test(combined) ||
            /(?:ποσο|poso)\s+(?:διαρκει|diarkei)\s+(?:η|i)\s+(?:διαδρομη|diadromi)/.test(combined) ||
            /(?:ποση|posi)\s+(?:ειναι|einai)\s+(?:η|i)\s+(?:διαρκεια|diarkeia)\s+(?:της|tis)\s+(?:διαδρομης|diadromis)/.test(combined) ||
            /(?:χρονος|xronos)\s+(?:διελευσης|dielefsis|διαδρομης|diadromis)/.test(combined)
        ) {
            return 'tripDuration';
        }

        /* 2. Προβλήτες εργασίας πλοίων — όχι πλοήγηση. */
        if (
            /(?:σε\s+)?ποια\s+προβλητα\s+(?:δουλευουν|εργαζονται|ειναι)(?:\s+(?:τα\s+)?(?:πλοια|καραβια))?/.test(combined) ||
            /(?:se\s+)?poia\s+provlita\s+(?:doulevoun|douleuoun|ergazontai|einai)(?:\s+(?:ta\s+)?(?:ploia|karavia))?/.test(combined) ||
            /που\s+δουλευουν(?:\s+(?:τα\s+)?(?:πλοια|καραβια))?/.test(combined) ||
            /pou\s+(?:doulevoun|douleuoun)(?:\s+(?:ta\s+)?(?:ploia|karavia))?/.test(combined)
        ) {
            return 'vesselPosition';
        }

        /* 3. Πόσα/ποια πλοία — στοιχεία πλοίων. */
        if (
            /(?:ποσα|ποια|posa|poia)\s+(?:πλοια|ploia)\s+(?:ειναι|δουλευουν|einai|doulevoun|douleuoun)/.test(combined)
        ) {
            return 'shipsDetails';
        }

        /* 4. Καιρός για μελλοντική ημέρα — πριν από πρόγραμμα. */
        if (
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio)/.test(combined) &&
            /(?:καιρο|καιρος|ανεμο|βροχη|προγνωση|kairo|kairos|anemo|vroxi|prognosi)/.test(combined)
        ) {
            return 'forecast';
        }

        /* 5. Γενική ερώτηση μελλοντικής λειτουργίας — τηλεφωνική επιβεβαίωση. */
        const generalFutureSchedule =
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio|δευτερα|τριτη|τεταρτη|πεμπτη|παρασκευη|σαββατο|κυριακη)/.test(combined) &&
            /(?:δρομολογια|dromologia|καραβια|karavia|πλοια|ploia|δουλευει|δουλευουν|doulevei|doulevoun)/.test(combined) &&
            !/(?:καιρο|καιρος|ανεμο|βροχη|προγνωση|kairo|kairos|anemo|vroxi|prognosi)/.test(combined) &&
            parseRequestedHour(text) === null &&
            detectDayPart(text) === null &&
            !/(?:μετα|πριν|μεχρι|εως|meta|prin|mexri)/.test(combined) &&
            detectPort(text) === null &&
            !/(?:πρωτο|τελευταιο|επομενο|proto|teleutaio|epomeno)\s+(?:δρομολογιο|πλοιο|καραβι|dromologio|ploio|karavi)/.test(combined);

        if (generalFutureSchedule || isGeneralTomorrowScheduleQuestion(text)) {
            return 'futureScheduleInfo';
        }

        /* 6. Χάρτες/πλοήγηση. Η λέξη προβλήτα μόνη της δεν αρκεί. */
        if (
            /^(?:χαρτεσ|χαρτη|xartes|xarti|maps)$/.test(raw) ||
            /(?:πλοηγηση|ploigisi)\s+(?:προς|pros)/.test(combined) ||
            /(?:πως|pos)\s+(?:παω|φτανω|pao|ftano)\s+(?:στο|στον|sto)\s+(?:ριο|αντιρριο|rio|antirrio|antiriro)/.test(combined)
        ) {
            return 'navigation';
        }

        /* 7. Πρόγραμμα επόμενης ώρας. */
        if (
            /(?:δρομολογια|dromologia|προγραμμα|programma)\s+ε?πομενη[σς]?\s+ωρα[σς]?/.test(combined) ||
            /(?:δρομολογια|dromologia|προγραμμα|programma)\s+epomenis?\s+oras?/.test(combined)
        ) {
            return 'next';
        }

        const rawIntent = detectRawIntent(text);
        if (rawIntent) return rawIntent;

        const directIntent = detectDirectIntent(text);
        if (directIntent) return directIntent;

        const result = detectIntentDetailed(text);
        if (result.score < 3) return null;
        return result.name;
    }


    /* =========================================================
       04. LIVE DATA SOURCES
       ========================================================= */
    function getElementText(doc, id) {
        if (!doc) return '';
        const el = doc.getElementById(id);
        if (!el) return '';
        const value = (el.textContent || '').trim();
        return value && value !== '--' ? value : '';
    }

    function getSafeText(id, fallback) {
        return getElementText(document, id) || fallback;
    }


    function parseVariableFromHtml(varName) {
        if (!state.rawHtml) return null;
        const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patterns = [
            new RegExp('(?:var|let|const|window\\.)?\\s*' + escaped + '\\s*=\\s*(\\[[\\s\\S]*?\\])\\s*;', 'm'),
            new RegExp('(?:var|let|const|window\\.)?\\s*' + escaped + '\\s*=\\s*([\'\"][\\s\\S]*?[\'\"])\\s*;', 'm')
        ];
        for (const pattern of patterns) {
            const match = state.rawHtml.match(pattern);
            if (!match || !match[1]) continue;
            try {
                if (match[1].startsWith('[')) return JSON.parse(match[1].replace(/'/g, '"'));
                return match[1].slice(1, -1);
            } catch (error) { console.warn('Αποτυχία ανάγνωσης μεταβλητής:', varName, error); }
        }
        return null;
    }

    async function loadLiveData(force) {
        if (isInsideLiveApp()) {
            state.appDoc = document;
            state.rawHtml = document.documentElement
                ? document.documentElement.innerHTML
                : '';
            state.loadedAt = Date.now();
            return;
        }

        if (
            !force &&
            state.appDoc &&
            Date.now() - state.loadedAt < 300000
        ) {
            return;
        }

        try {
            const response = await fetch(CONFIG.liveAppUrl, {
                credentials: 'same-origin',
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const html = await response.text();
            state.rawHtml = html;
            state.appDoc = new DOMParser().parseFromString(
                html,
                'text/html'
            );
            state.loadedAt = Date.now();
        } catch (error) {
            console.warn('Δεν φορτώθηκαν τα δεδομένα του App:', error);
            state.appDoc = null;
            state.rawHtml = '';
            state.loadedAt = Date.now();
        }
    }


    /* =========================================================
       05. SCHEDULE ENGINE
       ========================================================= */
    function parseTime(timeStr) {
        const match = String(timeStr || '').trim().match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return null;
        const h = Number(match[1]);
        const m = Number(match[2]);
        if (h < 0 || h > 23 || m < 0 || m > 59) return null;
        return { total: h * 60 + m };
    }

    function calculateNextTrips(scheduleArray, count) {
        if (!Array.isArray(scheduleArray) || !scheduleArray.length) return [];
        const now = new Date();
        const current = now.getHours() * 60 + now.getMinutes();
        return scheduleArray.map(function (timeStr) {
            const p = parseTime(timeStr);
            if (!p) return null;
            let diff = p.total - current;
            if (diff <= 0) diff += 1440;
            return { timeStr: String(timeStr), diff: diff };
        }).filter(Boolean).sort(function (a, b) { return a.diff - b.diff; }).slice(0, count || 3);
    }

    function formatWait(diff) {
        const h = Math.floor(diff / 60), m = diff % 60;
        return h > 0 ? h + ' ώρ. ' + m + ' λεπ.' : m + ' λεπ.';
    }

    function extractTimes(value) {
        const matches = String(value || '').match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g);
        return matches ? Array.from(new Set(matches)) : [];
    }

    function renderTimeList(value) {
        const values = Array.isArray(value)
            ? value.map(function (item) { return String(item).trim(); }).filter(Boolean)
            : extractTimes(value);

        if (!values.length) {
            const fallback = String(value || '')
                .replace(/[•·|]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            return fallback ? escapeHtml(fallback) : 'Μη διαθέσιμα δεδομένα.';
        }

        return '<span class="ai-time-list">' +
            values.map(function (time) {
                return '<span class="ai-time-item">' + escapeHtml(time) + '</span>';
            }).join('') +
            '</span>';
    }

    function parseRequestedHour(text) {
        /*
         * Κρατάμε τα σημεία ':' και '.' ώστε το 9:40 / 9.40
         * να μη μετατρέπεται λανθασμένα σε 09:00.
         */
        const source = stripAccents(String(text || '').toLowerCase())
            .replace(/ς/g, 'σ')
            .replace(/,/g, ':')
            .replace(/\s+/g, ' ')
            .trim();

        const raw = normalizeRawQuery(text);
        const normalized = normalizeText(text);
        const combined = source + ' ' + raw + ' ' + normalized;

        const explicitPatterns = [
            /*
             * Οι πλήρεις ώρες με λεπτά ελέγχονται πρώτες.
             * Έτσι το 09:40 δεν χάνει τα λεπτά από μεταγενέστερη
             * κανονικοποιημένη μορφή όπως «9 40».
             */
            /\b(\d{1,2})[:.](\d{1,2})\b/,
            /\b(\d{1,2})\s+(?:και|kai)\s+(\d{1,2})\b/,
            /(?:μετα|απο|στις|στισ)\s*(?:τις|τισ)?\s*(\d{1,2})(?:[:.](\d{1,2}))?/,
            /(?:meta|apo|stis)\s*(?:tis)?\s*(\d{1,2})(?:[:.](\d{1,2}))?/,
            /(?:ωρα|ora)\s*(\d{1,2})(?:[:.](\d{1,2}))?/
        ];

        let hour = null;
        let minute = 0;

        for (const pattern of explicitPatterns) {
            const match = combined.match(pattern);
            if (!match) continue;
            hour = Number(match[1]);
            minute = match[2] ? Number(match[2]) : 0;
            break;
        }

        if (hour === null) {
            const hasTimeContext =
                /(?:αυριο|aurio|avrio|σημερα|simera|πρωι|proi|μεσημερι|mesimeri|απογευμα|apogeuma|βραδυ|vradi)/.test(combined);

            if (hasTimeContext) {
                const match = combined.match(/\b(\d{1,2})(?:[:.](\d{1,2}))?\b/);
                if (match) {
                    hour = Number(match[1]);
                    minute = match[2] ? Number(match[2]) : 0;
                }
            }
        }

        if (
            hour === null ||
            hour < 0 ||
            hour > 23 ||
            minute < 0 ||
            minute > 59
        ) {
            return null;
        }

        const isMorning = /(?:πρωι|proi)/.test(combined);
        const isNoon = /(?:μεσημερι|mesimeri)/.test(combined);
        const isAfternoon = /(?:απογευμα|apogeuma)/.test(combined);
        const isEvening = /(?:βραδυ|vradi)/.test(combined);

        if (hour >= 1 && hour <= 11 && (isNoon || isAfternoon || isEvening)) {
            hour += 12;
        }

        if (hour === 12 && isMorning) {
            hour = 0;
        }

        return hour * 60 + minute;
    }

    function detectDayPart(text) {
        const n = normalizeText(text);

        if (n.includes('πρωι') || n.includes('proi')) return { start: 300, end: 720 };
        if (n.includes('μεσημερι') || n.includes('mesimeri')) return { start: 720, end: 1020 };
        if (n.includes('απογευμα') || n.includes('apogeuma')) return { start: 1020, end: 1260 };
        if (n.includes('βραδυ') || n.includes('vradi')) return { start: 1260, end: 1440 };

        return null;
    }

    function isTomorrowRequest(text) {
        const n = normalizeText(text);

        return n.includes('αυριο') ||
            n.includes('aurio') ||
            n.includes('avrio');
    }

    function isAfterRequest(text) {
        const n = normalizeText(text);

        return n.includes('μετα') ||
            n.includes('meta') ||
            n.includes('απο τισ') ||
            n.includes('απο τις') ||
            n.includes('apo tis');
    }

    function isBeforeRequest(text) {
        const n = normalizeText(text);

        return n.includes('πριν') ||
            n.includes('prin') ||
            n.includes('εωσ') ||
            n.includes('μεχρι') ||
            n.includes('mexri');
    }

    function hasSpecificScheduleTimeRequest(text) {
        return parseRequestedHour(text) !== null;
    }

    function findRequestedTrips(scheduleArray, userText, count) {
        if (!Array.isArray(scheduleArray) || !scheduleArray.length) {
            return [];
        }

        const requestedTime = parseRequestedHour(userText);
        const dayPart = detectDayPart(userText);
        const after = isAfterRequest(userText);
        const before = isBeforeRequest(userText);

        let start = dayPart ? dayPart.start : 0;
        let end = dayPart ? dayPart.end : 1440;

        if (requestedTime !== null) {
            if (before) {
                end = requestedTime;
            } else {
                start = after
                    ? requestedTime + 1
                    : requestedTime;
            }
        }

        return scheduleArray
            .map(function (timeStr) {
                const parsed = parseTime(timeStr);

                return parsed
                    ? {
                        timeStr: String(timeStr),
                        total: parsed.total
                    }
                    : null;
            })
            .filter(Boolean)
            .filter(function (trip) {
                return trip.total >= start &&
                    trip.total < end;
            })
            .sort(function (a, b) {
                return a.total - b.total;
            })
            .slice(0, count || 5);
    }


    /* =========================================================
       06. FERRY STATUS AND RESPONSE ENGINE
       ========================================================= */
    function getFerryStatusInfo() {
        const rawStatus = String(
            typeof window.ferryGlobalStatus !== 'undefined'
                ? window.ferryGlobalStatus
                : getSafeText('live-status', 'OPEN')
        ).trim();

        /*
         * Η κατάσταση είναι τιμή συστήματος και όχι ερώτηση χρήστη.
         * Δεν περνά από Greeklish μεταγραφή, γιατί το CLOSE γινόταν
         * «κλοσε» και αναγνωριζόταν λανθασμένα ως OPEN.
         */
        const statusToken = stripAccents(rawStatus)
            .toLowerCase()
            .replace(/ς/g, 'σ')
            .replace(/[^a-zα-ω]/g, '');

        const isClosed =
            statusToken === 'close' ||
            statusToken === 'closed' ||
            statusToken === 'κλειστο' ||
            statusToken === 'κλειστη' ||
            statusToken.includes('διακοπηδρομολογιων');

        const alertMessage =
            typeof window.ferryAlertMessage !== 'undefined' &&
            String(window.ferryAlertMessage || '').trim()
                ? String(window.ferryAlertMessage).trim()
                : 'Το πορθμείο είναι κλειστό και δεν εκτελούνται δρομολόγια αυτή τη στιγμή.';

        return {
            raw: rawStatus,
            token: statusToken,
            closed: isClosed,
            alertMessage: alertMessage
        };
    }

    function isFerryClosed() {
        return getFerryStatusInfo().closed;
    }


    function getCloseAlertExtraHtml(status) {
        const alertText = String(
            status && status.alertMessage
                ? status.alertMessage
                : ''
        ).trim();

        if (!alertText) return '';

        const normalizedAlert = normalizeText(alertText);
        const repeatsGenericNotice =
            normalizedAlert.includes('πορθμειο ειναι κλειστο') &&
            normalizedAlert.includes('δεν εκτελουνται δρομολογια');

        return repeatsGenericNotice
            ? ''
            : '<br><br>' + escapeHtml(alertText);
    }

    function getCloseFooterHtml(extraScope) {
        return '<br><br><strong>Για τον χρόνο επανέναρξης των δρομολογίων και την επιβεβαίωση λειτουργίας ή μη της γραμμής' +
            (extraScope ? ' ' + extraScope : '') +
            ', καλέστε το Λιμενικό Τμήμα Ρίου.</strong><br><br>' + centeredPhoneHtml();
    }

    function getCloseBaseHtml(prefix) {
        const status = getFerryStatusInfo();
        return '<strong>' + prefix + '</strong>' + getCloseAlertExtraHtml(status);
    }

    function getCloseNoticeHtml() {
        return getCloseBaseHtml('Αυτή τη στιγμή το πορθμείο είναι κλειστό και δεν εκτελούνται δρομολόγια.') +
            getCloseFooterHtml('');
    }

    function answerClosedOperation(intent, port, userText) {
        if (intent === 'next' || intent === 'next3' || intent === 'nextHour' || intent === 'liveDepartures') {
            return getCloseBaseHtml('Δεν υπάρχει διαθέσιμο επόμενο δρομολόγιο αυτή τη στιγμή, καθώς το πορθμείο είναι κλειστό και δεν εκτελούνται δρομολόγια.') +
                getCloseFooterHtml('');
        }

        if (intent === 'futureScheduleInfo') {
            return getCloseBaseHtml('Αυτή τη στιγμή το πορθμείο είναι κλειστό και δεν είναι δυνατή η επιβεβαίωση της λειτουργίας της γραμμής για μελλοντική ημερομηνία ή ώρα.') +
                getCloseFooterHtml('για την ημέρα και ώρα που σας ενδιαφέρει');
        }

        if (intent === 'continuousOperation') {
            return getCloseBaseHtml('Σε κανονικές συνθήκες, η πορθμειακή γραμμή Ρίου–Αντιρρίου λειτουργεί σε 24ωρη βάση, σύμφωνα με το πρόγραμμα δρομολογίων. Αυτή τη στιγμή όμως το πορθμείο είναι κλειστό και δεν εκτελούνται δρομολόγια.') +
                getCloseFooterHtml('');
        }

        if (intent === 'schedule') {
            return getCloseNoticeHtml() + '<br><br><hr><br>' +
                '<strong>Σε κανονική λειτουργία της γραμμής, το προγραμματισμένο ωράριο είναι το ακόλουθο:</strong><br><br>' +
                answerSchedule(port);
        }

        if (intent === 'frequency') {
            return getCloseNoticeHtml() + '<br><br><hr><br>' +
                '<strong>Σε κανονική λειτουργία της γραμμής, η συχνότητα των προγραμματισμένων δρομολογίων είναι η ακόλουθη:</strong><br><br>' +
                answerFrequency(userText);
        }

        if (intent === 'vesselPosition' || intent === 'departurePoint') {
            const combined = normalizeRawQuery(userText || '') + ' ' + normalizeText(userText || '');
            const future = /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio)/.test(combined);
            const futureText = future
                ? 'Η επιλογή της προβλήτας εργασίας και των αναχωρήσεων των πλοίων ' +
                  '(ανατολικά ή δυτικά) εξαρτάται από τις καιρικές συνθήκες και δεν μπορεί ' +
                  'να επιβεβαιωθεί εκ των προτέρων.<br><br>'
                : '';

            return futureText +
                '<strong>Η λειτουργία «Θέση Πλοίων» δεν είναι διαθέσιμη όσο το πορθμείο παραμένει κλειστό.</strong>' +
                '<br><br>' + getCloseNoticeHtml();
        }

        if (intent === 'distanceGps' || intent === 'gps') {
            return '<strong>Η λειτουργία «Απόσταση GPS» δεν είναι διαθέσιμη όσο το πορθμείο παραμένει κλειστό.</strong>' +
                '<br><br>' + getCloseNoticeHtml();
        }

        return getCloseNoticeHtml();
    }

    function centeredPhoneHtml() {
        return '<div style="text-align:center;margin:10px 0 2px;">' +
            '📞 <a href="tel:2610991203" style="display:inline-block;">2610 991203</a>' +
            '</div>';
    }

    function answerFutureScheduleInfo() {
        return '<strong>Πληροφορίες μελλοντικών δρομολογίων</strong><br><br>' +
            'Η επιβεβαίωση από τον <strong>Rio-Antirrio AI Assistant</strong> της εκτέλεσης δρομολογίων και των συνθηκών λειτουργίας της γραμμής σε μελλοντικό χρόνο <strong>ενέχει κίνδυνο ανακριβούς πληροφόρησης</strong>, καθώς ενδέχεται να προκύψουν μεταβολές που δεν μπορούν να προβλεφθούν εκ των προτέρων.<br><br>' +
            'Για τις προγραμματισμένες ώρες αναχώρησης μπορείτε να ρωτήσετε <strong>«Πρόγραμμα δρομολογίων»</strong>.<br><br>' +
            'Για επιβεβαίωση της μελλοντικής λειτουργίας της γραμμής ή της εκτέλεσης δρομολογίων, επικοινωνήστε με το <strong>Λιμενικό Τμήμα Ρίου</strong>.<br><br>' +
            centeredPhoneHtml();
    }

    function getOrthodoxEasterDate(year) {
        const a = year % 4;
        const b = year % 7;
        const c = year % 19;
        const d = (19 * c + 15) % 30;
        const e = (2 * a + 4 * b - d + 34) % 7;
        const julianMonth = Math.floor((d + e + 114) / 31);
        const julianDay = ((d + e + 114) % 31) + 1;

        /*
         * Μετατροπή Ιουλιανού σε Γρηγοριανό ημερολόγιο.
         * Για τα σύγχρονα έτη η διαφορά είναι 13 ημέρες.
         */
        return new Date(year, julianMonth - 1, julianDay + 13);
    }

    function detectHolidayReference(userText) {
        const raw = normalizeRawQuery(userText || '');
        const normalized = normalizeText(userText || '');
        const combined = raw + ' ' + normalized;

        if (/(?:χριστουγεννα|χριστουγενα|xristougenna|xrisotugenna|xristugenna|xristougena|xristogena|christougenna|christmas)/.test(combined)) {
            return {
                key: 'christmas',
                title: 'την ημέρα των Χριστουγέννων',
                month: 11,
                day: 25
            };
        }

        if (/(?:πρωτοχρονια|protoxronia|protochronia|newyear)/.test(combined)) {
            return {
                key: 'newyear',
                title: 'την ημέρα της Πρωτοχρονιάς',
                month: 0,
                day: 1
            };
        }

        if (/(?:κυριακη\s+του\s+πασχα|ημερα\s+του\s+πασχα|πασχα|pasxa|pascha)/.test(combined)) {
            return {
                key: 'easter',
                title: 'την Κυριακή του Πάσχα'
            };
        }

        return null;
    }

    function isTodayHoliday(holiday) {
        if (!holiday) return false;
        const today = new Date();

        if (holiday.key === 'easter') {
            const easter = getOrthodoxEasterDate(today.getFullYear());
            return today.getFullYear() === easter.getFullYear() &&
                today.getMonth() === easter.getMonth() &&
                today.getDate() === easter.getDate();
        }

        return today.getMonth() === holiday.month &&
            today.getDate() === holiday.day;
    }

    function answerHolidayOperation(userText) {
        const holiday = detectHolidayReference(userText);
        if (!holiday) return null;

        const status = getFerryStatusInfo();

        /*
         * Αν την ίδια την εορτάσιμη ημέρα η live μεταβλητή δηλώνει OPEN,
         * υπερισχύει η πραγματική ζωντανή κατάσταση.
         */
        if (isTodayHoliday(holiday) && !status.closed) {
            return null;
        }

        return 'Η πορθμειακή γραμμή Ρίου–Αντιρρίου ' +
            holiday.title +
            ' παραμένει κλειστή και δεν εκτελούνται δρομολόγια.' +
            '<br><br>Για επιβεβαίωση της λειτουργίας και ενημέρωση σχετικά με ' +
            'την επανέναρξη των δρομολογίων, επικοινωνήστε με το Λιμενικό Τμήμα Ρίου.' +
            '<br><br>' + centeredPhoneHtml();
    }

    function answerStatus() {
        const status = getFerryStatusInfo();
        if (status.closed) {
            return 'Το πορθμείο αυτή τη στιγμή είναι:' +
                '<br><br>🔴 <strong>ΚΛΕΙΣΤΟ</strong>' +
                '<br><br>Τα πλοία δεν εκτελούν δρομολόγια.' +
                getCloseAlertExtraHtml(status) +
                '<br><br>Για περισσότερες πληροφορίες, επικοινωνήστε με το Λιμενικό Τμήμα Ρίου.' +
                '<br><br>' + centeredPhoneHtml();
        }
        return 'Το πορθμείο αυτή τη στιγμή είναι:' +
            '<br><br>🟢 <strong>ΑΝΟΙΚΤΟ</strong>' +
            '<br><br>Τα δρομολόγια εκτελούνται κανονικά, σύμφωνα με το πρόγραμμα δρομολογίων.';
    }

    function answerStatusToday(userText) {
        const status = getFerryStatusInfo();
        if (status.closed) return answerStatus();
        const normalized = normalizeText(userText || '');
        const dayParts = [
            { words: ['πρωι', 'proi'], label: 'το πρωί' },
            { words: ['μεσημερι', 'mesimeri'], label: 'το μεσημέρι' },
            { words: ['απογευμα', 'apogeuma'], label: 'το απόγευμα' },
            { words: ['βραδυ', 'νυχτα', 'vradi', 'nyxta'], label: 'το βράδυ' }
        ];
        const requestedPart = dayParts.find(function (part) {
            return part.words.some(function (word) { return normalized.includes(word); });
        });
        const asksGeneralShipToday = /(?:καραβι|καραβια|πλοιο|πλοια|karavi|karavia|ploio|ploia)/.test(normalized);
        if (requestedPart || asksGeneralShipToday) {
            const periodText = requestedPart
                ? 'Ναι, σήμερα ' + requestedPart.label + ' εκτελούνται κανονικά δρομολόγια, σύμφωνα με το πρόγραμμα δρομολογίων.'
                : 'Το πορθμείο σήμερα είναι:<br><br>🟢 <strong>ΑΝΟΙΚΤΟ</strong>' +
                    '<br><br>Τα δρομολόγια εκτελούνται κανονικά, σύμφωνα με το πρόγραμμα δρομολογίων.';
            return periodText + '<br><br>Για συγκεκριμένες ώρες αναχώρησης, μπορείτε να ρωτήσετε για το πρόγραμμα δρομολογίων.';
        }
        let rio = '--', ant = '--';
        if (isInsideLiveApp()) {
            rio = getSafeText('rio-clock', getSafeText('next-rio-short', '--'));
            ant = getSafeText('ant-clock', getSafeText('next-ant-short', '--'));
        } else {
            rio = getSafeText('mini-id-rio-val', '--');
            ant = getSafeText('mini-id-ant-val', '--');
        }
        return 'Το πορθμείο αυτή τη στιγμή είναι:' +
            '<br><br>🟢 <strong>ΑΝΟΙΚΤΟ</strong>' +
            '<br><br>Τα δρομολόγια εκτελούνται κανονικά, σύμφωνα με το πρόγραμμα δρομολογίων.' +
            '<br><br><strong>Επόμενο από Ρίο:</strong> ' + escapeHtml(rio) +
            '<br><br><strong>Επόμενο από Αντίρριο:</strong> ' + escapeHtml(ant);
    }

    function getScheduleArray(name) {
        const liveValue = window[name];
        if (Array.isArray(liveValue)) {
            return liveValue.slice();
        }

        const fetchedValue = parseVariableFromHtml(name);
        return Array.isArray(fetchedValue)
            ? fetchedValue.slice()
            : [];
    }

    function answerSpecificSchedule(userText, port) {
        const rioTrips = findRequestedTrips(
            getScheduleArray('dRio'),
            userText,
            3
        );

        const antTrips = findRequestedTrips(
            getScheduleArray('dAnt'),
            userText,
            3
        );

        function formatTrips(trips) {
            return trips.length
                ? renderTimeList(
                    trips.map(function (trip) {
                        return trip.timeStr;
                    })
                )
                : 'Δεν βρέθηκαν δρομολόγια στο συγκεκριμένο χρονικό διάστημα.';
        }

        const normalized = normalizeText(userText);
        const tomorrow = isTomorrowRequest(userText);
        const requestedMinutes = parseRequestedHour(userText);

        let periodLabel = tomorrow
            ? 'αύριο'
            : 'στο χρονικό διάστημα που ζητήσατε';

        if (requestedMinutes !== null) {
            const requestedHour =
                String(
                    Math.floor(requestedMinutes / 60)
                ).padStart(2, '0');

            const requestedMinute =
                String(
                    requestedMinutes % 60
                ).padStart(2, '0');

            const connector = isAfterRequest(userText)
                ? 'μετά τις'
                : isBeforeRequest(userText)
                    ? 'πριν τις'
                    : 'από τις';

            periodLabel =
                (tomorrow ? 'αύριο ' : '') +
                connector +
                ' ' +
                requestedHour +
                ':' +
                requestedMinute;
        } else if (normalized.includes('πρωι')) {
            periodLabel =
                (tomorrow ? 'αύριο ' : '') +
                'το πρωί';
        }

        if (port === 'rio') {
            return '<strong>Δρομολόγια από Ρίο ' +
                periodLabel +
                ':</strong><br><br>' +
                formatTrips(rioTrips);
        }

        if (port === 'ant') {
            return '<strong>Δρομολόγια από Αντίρριο ' +
                periodLabel +
                ':</strong><br><br>' +
                formatTrips(antTrips);
        }

        return '<strong>Δρομολόγια ' +
            periodLabel +
            ':</strong><br><br>' +
            '<strong>Από Ρίο:</strong><br>' +
            formatTrips(rioTrips) +
            '<br><br><strong>Από Αντίρριο:</strong><br>' +
            formatTrips(antTrips);
    }


    function formatNextTripLine(trip) {
        if (!trip) return 'Μη διαθέσιμα δεδομένα.';
        return '• ' + escapeHtml(trip.timeStr) +
            ' <small>(' + escapeHtml(formatWait(trip.diff)) + ')</small>';
    }

    function answerNextForPort(port) {
        const label = port === 'rio' ? 'Ρίο' : 'Αντίρριο';
        const schedule = getScheduleArray(port === 'rio' ? 'dRio' : 'dAnt');
        const trips = calculateNextTrips(schedule, 3);

        if (!trips.length) {
            return '<strong>Επόμενο δρομολόγιο από ' + label + '</strong><br><br>' +
                'Δεν υπάρχουν διαθέσιμα δεδομένα δρομολογίων.';
        }

        return '<strong>Το επόμενο δρομολόγιο από ' + label +
            ' αναχωρεί στις ' + escapeHtml(trips[0].timeStr) +
            ' (' + escapeHtml(formatWait(trips[0].diff)) + ').</strong>' +
            '<br><br><strong>Τα επόμενα 3 δρομολόγια είναι:</strong><br><br>' +
            trips.map(formatNextTripLine).join('<br>');
    }

    function answerNext3(port) {
        function render(label, trips) {
            if (!trips.length) return '<strong>Από ' + label + ':</strong><br>Μη διαθέσιμα δεδομένα.';
            return '<strong>Από ' + label + ':</strong><br>' + trips.map(formatNextTripLine).join('<br>');
        }

        if (port === 'rio' || port === 'ant') {
            const label = port === 'rio' ? 'Ρίο' : 'Αντίρριο';
            const trips = calculateNextTrips(getScheduleArray(port === 'rio' ? 'dRio' : 'dAnt'), 3);
            return '<strong>Τα επόμενα 3 δρομολόγια από ' + label + ' είναι:</strong><br><br>' +
                (trips.length ? trips.map(formatNextTripLine).join('<br>') : 'Μη διαθέσιμα δεδομένα.');
        }

        return '<strong>Τα επόμενα 3 δρομολόγια είναι:</strong><br><br>' +
            render('Ρίο', calculateNextTrips(getScheduleArray('dRio'), 3)) + '<br><br>' +
            render('Αντίρριο', calculateNextTrips(getScheduleArray('dAnt'), 3));
    }

    function answerNextHour(port) {
        function withinHour(key) {
            return calculateNextTrips(getScheduleArray(key), 20).filter(function (trip) {
                return trip.diff >= 0 && trip.diff <= 60;
            });
        }
        function render(label, trips) {
            return '<strong>Από ' + label + ':</strong><br>' +
                (trips.length ? trips.map(formatNextTripLine).join('<br>') : 'Δεν υπάρχει δρομολόγιο μέσα στα επόμενα 60 λεπτά.');
        }
        const rioHour = withinHour('dRio');
        const antHour = withinHour('dAnt');
        let first = '<strong>Δρομολόγια μέσα στην επόμενη ώρα:</strong><br><br>';
        if (port === 'rio') first += render('Ρίο', rioHour);
        else if (port === 'ant') first += render('Αντίρριο', antHour);
        else first += render('Ρίο', rioHour) + '<br><br>' + render('Αντίρριο', antHour);
        return first +
            '<br><br><strong>Για τα επόμενα 3 διαθέσιμα δρομολόγια, ρωτήστε «Επόμενα δρομολόγια».</strong>';
    }

    function answerNext(port, userText) {
        if (hasSpecificScheduleTimeRequest(userText)) {
            return answerSpecificSchedule(userText, port);
        }

        if (port === 'rio') return answerNextForPort('rio');
        if (port === 'ant') return answerNextForPort('ant');

        const rioTrips = calculateNextTrips(getScheduleArray('dRio'), 1);
        const antTrips = calculateNextTrips(getScheduleArray('dAnt'), 1);
        const now = new Date();
        const currentTime = String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0');

        function renderNext(label, trips) {
            if (!trips.length) {
                return '• Από ' + label + ': Μη διαθέσιμα δεδομένα';
            }

            return '• Από ' + label + ' σε: ' +
                escapeHtml(formatWait(trips[0].diff)) +
                ' στις ' + escapeHtml(trips[0].timeStr);
        }

        return '<strong>Η ώρα είναι: ' + escapeHtml(currentTime) + '</strong><br><br>' +
            '<strong>Επόμενο πλοίο:</strong><br><br>' +
            renderNext('Ρίο', rioTrips) + '<br>' +
            renderNext('Αντίρριο', antTrips);
    }


    function answerSchedule(port) {
        const rio = renderTimeList(getScheduleArray('dRio'));
        const ant = renderTimeList(getScheduleArray('dAnt'));

        if (port === 'rio') {
            return '<strong>Ώρες δρομολογίων από Ρίο:</strong><br><br>' + rio;
        }

        if (port === 'ant') {
            return '<strong>Ώρες δρομολογίων από Αντίρριο:</strong><br><br>' + ant;
        }

        return '<strong>Πλήρες πρόγραμμα δρομολογίων:</strong><br><br>' +
            '<strong>Ρίο:</strong><br>' + rio +
            '<br><br><strong>Αντίρριο:</strong><br>' + ant +
            '<br><br>🔗 <a href="' + CONFIG.links.schedule +
            '" target="_blank" rel="noopener noreferrer">Αναλυτικά δρομολόγια</a>';
    }

    function normalizePriceEntries(source) {
        if (!source) return [];

        if (Array.isArray(source)) {
            return source
                .map(function (item) {
                    if (Array.isArray(item) && item.length >= 2) {
                        return {
                            label: item[0],
                            value: item[1]
                        };
                    }

                    if (item && typeof item === 'object') {
                        return {
                            label:
                                item.label ||
                                item.name ||
                                item.title ||
                                item.category ||
                                item.type,
                            value:
                                item.value ||
                                item.price ||
                                item.cost ||
                                item.amount
                        };
                    }

                    return null;
                })
                .filter(function (item) {
                    return item &&
                        item.label != null &&
                        item.value != null;
                });
        }

        if (typeof source === 'object') {
            return Object.keys(source)
                .map(function (key) {
                    return {
                        label: key,
                        value: source[key]
                    };
                })
                .filter(function (item) {
                    return item.value != null &&
                        typeof item.value !== 'object';
                });
        }

        return [];
    }

    function collectPriceEntries(doc) {
        if (!doc) return [];

        const entries = [];
        const items = doc.querySelectorAll(
            '#price-list .price-item'
        );

        items.forEach(function (item) {
            const label = item.querySelector('.p-label');
            const value = item.querySelector('.p-val');

            if (label && value) {
                entries.push({
                    label: label.textContent.trim(),
                    value: value.textContent.trim()
                });
            }
        });

        return entries;
    }

    function getPriceEntries() {
        const globalCandidates = [
            window.ferryPrices,
            window.ferryPriceList,
            window.priceList,
            window.ticketPrices,
            window.nauloi,
            window.prices
        ];

        for (let i = 0; i < globalCandidates.length; i++) {
            const entries = normalizePriceEntries(
                globalCandidates[i]
            );

            if (entries.length) return entries;
        }

        const currentPageEntries = collectPriceEntries(document);
        if (currentPageEntries.length) return currentPageEntries;

        if (state.appDoc && state.appDoc !== document) {
            const appEntries = collectPriceEntries(state.appDoc);
            if (appEntries.length) return appEntries;
        }

        return [];
    }

    function findPriceByTerms(terms) {
        const entries = getPriceEntries();
        for (const entry of entries) {
            const label = normalizeText(entry.label || '');
            if (terms.some(function (term) { return label.includes(normalizeText(term)); })) {
                return String(entry.value || '').trim();
            }
        }
        return '';
    }

    function answerFrequency(userText) {
        const rio = getScheduleArray('dRio');
        const ant = getScheduleArray('dAnt');
        const raw = normalizeRawQuery(userText || '');
        const normalized = normalizeText(userText || '');
        const frequencyQuery = raw + ' ' + normalized;

        const periods = [
            {
                key: 'morning',
                label: 'Πρωινή βάρδια (06:30–15:00)',
                sentence: 'Την πρωινή βάρδια',
                start: 6 * 60 + 30,
                end: 15 * 60,
                matches: ['πρωι', 'μεσημερι', 'proi', 'mesimeri']
            },
            {
                key: 'afternoon',
                label: 'Απογευματινή βάρδια (15:00–23:00)',
                sentence: 'Την απογευματινή βάρδια',
                start: 15 * 60,
                end: 23 * 60,
                matches: ['απογευμα', 'apogeuma']
            },
            {
                key: 'night',
                label: 'Νυχτερινή βάρδια (23:00–06:30)',
                sentence: 'Τη νυχτερινή βάρδια',
                start: 23 * 60,
                end: 24 * 60 + 6 * 60 + 30,
                matches: ['βραδυ', 'νυχτα', 'vradi', 'nyxta']
            }
        ];

        function normalizeSchedule(schedule) {
            return schedule
                .map(parseTime)
                .filter(Boolean)
                .map(function (item) { return item.total; })
                .sort(function (a, b) { return a - b; });
        }

        function periodDiffs(schedule, period) {
            let values = normalizeSchedule(schedule);

            if (period.end > 1440) {
                values = values.concat(
                    values.map(function (value) {
                        return value + 1440;
                    })
                );
            }

            values = values.filter(function (value) {
                return value >= period.start && value <= period.end;
            });

            const diffs = [];
            for (let i = 1; i < values.length; i++) {
                const diff = values[i] - values[i - 1];
                if (diff > 0 && diff <= 180) diffs.push(diff);
            }
            return diffs;
        }

        function summarize(diffs) {
            if (!diffs.length) return 'δεν υπάρχουν διαθέσιμα δεδομένα';

            const sorted = diffs.slice().sort(function (a, b) {
                return a - b;
            });
            const min = sorted[0];
            const max = sorted[sorted.length - 1];
            const counts = {};

            diffs.forEach(function (value) {
                counts[value] = (counts[value] || 0) + 1;
            });

            const mode = Number(
                Object.keys(counts).sort(function (a, b) {
                    return counts[b] - counts[a] || Number(a) - Number(b);
                })[0]
            );

            if (min === max) return 'περίπου κάθε ' + mode + ' λεπτά';
            if (max - min <= 10) {
                return 'περίπου κάθε ' + min + '–' + max + ' λεπτά';
            }

            return 'συνήθως κάθε ' + mode +
                ' λεπτά (εύρος ' + min + '–' + max + ' λεπτά)';
        }

        function findRequestedPeriod() {
            return periods.find(function (period) {
                return period.matches.some(function (word) {
                    return frequencyQuery.includes(word);
                });
            }) || null;
        }

        const requestedPort = detectPort(userText || '');

        function periodLine(period) {
            const title = '<strong>' + period.label +
                (requestedPort === 'rio'
                    ? ' από Ρίο'
                    : requestedPort === 'ant'
                        ? ' από Αντίρριο'
                        : '') +
                '</strong><br><br>';

            if (requestedPort === 'rio') {
                return title + period.sentence +
                    ', τα πλοία από Ρίο εκτελούν δρομολόγια ' +
                    summarize(periodDiffs(rio, period)) + '.';
            }

            if (requestedPort === 'ant') {
                return title + period.sentence +
                    ', τα πλοία από Αντίρριο εκτελούν δρομολόγια ' +
                    summarize(periodDiffs(ant, period)) + '.';
            }

            return title +
                period.sentence + ', τα πλοία εκτελούν δρομολόγια:<br><br>' +
                '• Από Ρίο: ' + summarize(periodDiffs(rio, period)) + '<br>' +
                '• Από Αντίρριο: ' + summarize(periodDiffs(ant, period));
        }

        const requestedPeriod = findRequestedPeriod();

        if (requestedPeriod) {
            return 'Σε κανονική λειτουργία της γραμμής, τα δρομολόγια εκτελούνται ως εξής:' +
                '<br><br>' + periodLine(requestedPeriod) +
                '<br><br><small>Η συχνότητα υπολογίζεται από το ισχύον πρόγραμμα ' +
                'δρομολογίων και μπορεί να μεταβάλλεται.</small>' +
                '<br><br><strong>Για συγκεκριμένες ώρες αναχώρησης, ρωτήστε «Ώρες Δρομολογίων» ή «Πρόγραμμα Δρομολογίων».</strong>';
        }

        return '<strong>Συχνότητα δρομολογίων</strong><br><br>' +
            periods.map(periodLine).join('<br><br>') +
            '<br><br><small>Η συχνότητα υπολογίζεται από το ισχύον πρόγραμμα ' +
            'δρομολογίων και μπορεί να μεταβάλλεται.</small>' +
            '<br><br><strong>Για συγκεκριμένες ώρες αναχώρησης, ρωτήστε «Ώρες Δρομολογίων» ή «Πρόγραμμα Δρομολογίων».</strong>';
    }

    function answerPassengerFare() {
        const carPrice = findPriceByTerms([
            'ιχ επιβατικα',
            'ι.χ. επιβατικα',
            'αυτοκινητο'
        ]);

        return '<strong>Οι επιβάτες ταξιδεύουν ΔΩΡΕΑΝ.</strong><br><br>' +
            'Πληρώνουν μόνο τα οχήματα.' +
            (carPrice
                ? '<br>Η τιμή για ένα Ι.Χ. επιβατικό είναι <strong>' +
                    escapeHtml(carPrice) +
                    '</strong>.'
                : '<br><br>🔗 <a href="' + CONFIG.links.prices +
                    '" target="_blank" rel="noopener noreferrer">' +
                    'Αναλυτικός τιμοκατάλογος</a>');
    }

    function answerFareOrDurationClarify() {
        return '<strong>Με τι όχημα θέλετε να ταξιδέψετε;</strong><br>' +
            'Για τις τιμές ανά κατηγορία, ρωτήστε «Τιμές ναύλου».<br><br>' +
            'Αν εννοείτε πόσο διαρκεί η διαδρομή, ρωτήστε συγκεκριμένα για τη διάρκεια της διέλευσης.';
    }

    function answerTripDuration() {
        return '<strong>Χρόνος διέλευσης</strong><br><br>' +
            'Η διάρκεια της διαδρομής Ρίου–Αντιρρίου με το πλοίο είναι περίπου <strong>15 λεπτά</strong>.';
    }

    function answerPayment() {
        return '<strong>Πληρωμή και έκδοση εισιτηρίου</strong><br><br>' +
            'Η πληρωμή πραγματοποιείται εντός του πλοίου, κατά την επιβίβαση ή πριν από την αναχώρηση.<br><br>' +
            'Μπορείτε να πληρώσετε:<br><br>' +
            '• 💳 με POS / κάρτα<br>' +
            '• 💶 με μετρητά<br><br>' +
            'Δεν υπάρχουν ξεχωριστά εκδοτήρια στην ξηρά. Το εισιτήριο εκδίδεται και εξοφλείται μέσα στο πλοίο.<br><br>' +
            'Δεν απαιτείται κράτηση. Για την καλύτερη εξυπηρέτησή σας, προσέλθετε εγκαίρως στο πλοίο.';
    }

    function answerPrices(userText) {
        const entries = getPriceEntries();
        const raw = normalizeRawQuery(userText || '');

        if (!entries.length) {
            return '<strong>Τιμές ναύλου:</strong><br><br>Δεν βρέθηκαν διαθέσιμα δεδομένα τιμών στην τρέχουσα σελίδα.<br><br>' +
                '🔗 <a href="' + CONFIG.links.prices + '" target="_blank" rel="noopener noreferrer">Αναλυτικός τιμοκατάλογος</a>';
        }

        const categoryRules = [
            { label: 'μηχανάκι', terms: ['μηχανακια','μηχανη','μηχανακι'], re: /(?:μηχανη|μηχανακι|μηχανακια|mixani|mixanaki|mixanakia|moto|motor|scooter|παπι|papi)/ },
            { label: 'Ι.Χ. επιβατικό', terms: ['ιχ επιβατικα','ι.χ. επιβατικα','αυτοκινητο'], re: /(?:\bix\b|\bιχ\b|αυτοκινητο|αμαξι|aftokinito|autokinito|amaksi|amaxi)/ },
            { label: 'επιβάτη', terms: ['επιβατες'], re: /(?:επιβατη|επιβατες|πεζο|πεζος|epivati|epivates|pezos)/ },
            { label: 'πολύτεκνο / ΑμεΑ', terms: ['πολυτεκνικο','αμεα'], re: /(?:πολυτεκν|αμεα|polytekn|politekn|amea|αναπηρικ|anapirik)/ },
            { label: 'φορτηγό 2 αξόνων', terms: ['φορτηγα 2 αξονες'], re: /(?:φορτηγο|fortigo).*?(?:2|δυο|dyo)/ },
            { label: 'φορτηγό 3 αξόνων', terms: ['φορτηγα 3 αξονες'], re: /(?:φορτηγο|fortigo).*?(?:3|τρεις|treis)/ },
            { label: 'φορτηγό 4 αξόνων', terms: ['φορτηγα 4 αξονες'], re: /(?:φορτηγο|fortigo).*?(?:4|τεσσερις|tesseris)/ },
            { label: 'φορτηγό 5 αξόνων', terms: ['φορτηγα 5 αξονες'], re: /(?:φορτηγο|fortigo).*?(?:5|πεντε|pente)/ },
            { label: 'λεωφορείο έως 40 θέσεις', terms: ['λεωφορεια εως 40'], re: /(?:λεωφορειο|leoforeio).*?(?:εως 40|mexri 40)/ },
            { label: 'λεωφορείο άνω των 40 θέσεων', terms: ['λεωφορεια 40+'], re: /(?:λεωφορειο|leoforeio).*?(?:40\+|πανω απο 40|ano ton 40)/ }
        ];

        const asksGenericBus = /(?:λεωφορειο|λεωφορεια|leoforeio|leoforeia|poulman|πουλμαν|autobus|\bbus\b)/.test(raw) &&
            !/(?:εως\s*40|μεχρι\s*40|πανω\s*απο\s*40|40\+|mexri\s*40|pano\s*apo\s*40)/.test(raw);

        const requested = categoryRules.find(function (rule) { return rule.re.test(raw); });
        let direct = '';

        if (asksGenericBus) {
            const busEntries = entries.filter(function (entry) {
                return /λεωφορ/i.test(normalizeText(entry.label || ''));
            });
            if (busEntries.length) {
                direct = '<strong>Τιμές λεωφορείων:</strong><br><br>' +
                    busEntries.map(function (entry) {
                        return '• <strong>' + escapeHtml(entry.label) + ': ' + escapeHtml(entry.value) + '</strong>';
                    }).join('<br>') + '<br><br><hr><br>';
            }
        }

        if (requested && !direct) {
            const matchedEntry = entries.find(function (entry) {
                const label = normalizeText(entry.label || '');
                return requested.terms.some(function (term) {
                    return label.includes(normalizeText(term));
                });
            });

            if (matchedEntry) {
                const isVehicleCategory =
                    /(?:μηχαν|ι\.?χ|αυτοκινητ|φορτηγ|λεωφορ)/i.test(matchedEntry.label || '');

                direct =
                    '<strong>' +
                    (isVehicleCategory ? 'Τιμή της κατηγορίας οχήματος:' : 'Τιμή κατηγορίας:') +
                    '</strong><br><br>' +
                    '<strong>' + escapeHtml(matchedEntry.label) + ': ' +
                    escapeHtml(matchedEntry.value) + '</strong>' +
                    '<br><br><hr><br>';
            }
        }

        const prices = entries.map(function (entry) {
            return '• ' + escapeHtml(entry.label) + ': <strong>' + escapeHtml(entry.value) + '</strong>';
        }).join('<br>');

        return direct + '<strong>Τιμές ναύλου:</strong><br><br>' + prices +
            '<br><br>🔗 <a href="' + CONFIG.links.prices + '" target="_blank" rel="noopener noreferrer">Αναλυτικός τιμοκατάλογος</a>';
    }

    function getCurrentWeatherDataHtml() {
        let temperature = '--';
        let wind = '--';
        let description = 'Μη διαθέσιμο';

        if (isInsideLiveApp()) {
            temperature = getSafeText('temp-val', '--');
            wind = getSafeText('wind-val', '--');
            description = getSafeText('weather-desc', 'Μη διαθέσιμο');
        } else {
            temperature = getSafeText('mini-id-temp', '--');
            wind = getSafeText('mini-id-wind', '--');
            description = getSafeText('mini-id-desc', 'Μη διαθέσιμο');
        }

        return '<strong>Δεδομένα καιρού τώρα:</strong><br><br>' +
            '• <strong>Θερμοκρασία:</strong> ' + escapeHtml(temperature) + '<br>' +
            '• <strong>Άνεμος:</strong> ' + escapeHtml(wind) + '<br>' +
            '• <strong>Κατάσταση:</strong> ' + escapeHtml(description);
    }

    function answerWeather() {
        return getCurrentWeatherDataHtml() +
            '<br><br>Για την ένταση των ανέμων στο πορθμείο σε πραγματικό χρόνο:<br><br>' +
            '🔗 <a href="' + CONFIG.links.meteoRioLive + '" target="_blank" rel="noopener noreferrer">Μετεωρολογικός Σταθμός Ρίου</a><br><br>' +
            '<small style="font-size:11px;opacity:0.82;">Ο σταθμός φιλοξενείται στο Λιμενικό Τμήμα Ρίου.</small>';
    }

    function answerForecast() {
        return getCurrentWeatherDataHtml() +
            '<br><br><strong>Πρόγνωση Καιρού</strong><br><br>' +
            'Για πρόγνωση καιρού, ανέμου και πληροφορίες σχετικά με τις καιρικές συνθήκες ' +
            'που ενδέχεται να επηρεάσουν τη λειτουργία του πορθμείου, επισκεφθείτε τη σελίδα ' +
            '«Ο Καιρός στο Ρίο».<br><br>' +
            '🔗 <a href="' + CONFIG.links.forecast +
            '" target="_blank" rel="noopener noreferrer">Ο Καιρός στο Ρίο</a><br><br>';
    }

    function answerVesselPosition(userText) {
        const raw = normalizeRawQuery(userText || '');
        const normalized = normalizeText(userText || '');
        const combined = raw + ' ' + normalized;
        const asksFuture =
            /(?:αυριο|aurio|avrio|μεθαυριο|methaurio|methavrio)/.test(combined);

        const futureNote = asksFuture
            ? 'Η επιλογή της προβλήτας εργασίας και των αναχωρήσεων των πλοίων ' +
              '(ανατολικά ή δυτικά) εξαρτάται από τις καιρικές συνθήκες που ' +
              'επικρατούν στο πορθμείο. Για τον λόγο αυτό, δεν μπορεί να ' +
              'επιβεβαιωθεί εκ των προτέρων.<br><br>'
            : '';

        if (isInsideLiveApp()) {
            return futureNote +
                '🛰️ <strong>Ανοίγω τη λειτουργία «Θέση Πλοίων».</strong><br><br>' +
                'Μπορείτε να δείτε την τρέχουσα θέση και κίνηση των πλοίων, καθώς και ' +
                'τις προβλήτες από τις οποίες εκτελούνται τα δρομολόγια ' +
                '(ανατολικά ή δυτικά).';
        }

        return futureNote +
            '<strong>Για την τρέχουσα θέση και κίνηση των πλοίων, επισκεφθείτε ' +
            'την ενότητα «Κίνηση Πλοίων».</strong><br><br>' +
            '🔗 <a href="' + CONFIG.links.traffic +
            '" target="_blank" rel="noopener noreferrer">Κίνηση Πλοίων</a>';
    }

    function answerDistanceGps() {
        if (isInsideLiveApp()) {
            return '🛰️ <strong>Ανοίγω την Απόσταση GPS.</strong><br><br>' +
                'Επιτρέψτε την πρόσβαση στην τοποθεσία σας για να δείτε πόσο χρόνο ' +
                'θέλετε για να φτάσετε στο καράβι, πόσο μακριά βρίσκεστε και ' +
                'πληροφορίες πλοήγησης προς το πορθμείο.';
        }
        return '🛰️ <strong>Απόσταση GPS και χρόνος άφιξης:</strong><br><br>' +
            'Αυτή η λειτουργία είναι διαθέσιμη μόνο στο App (Rio-Antirrio Live), ' +
            'επειδή χρειάζεται πρόσβαση στην τοποθεσία της συσκευής σας.<br><br>' +
            '🔗 <a href="' + CONFIG.liveAppUrl +
            '" target="_blank" rel="noopener noreferrer">Rio-Antirrio Live – Απόσταση GPS</a>';
    }

    function answerNavigation(port) {
        if (!isInsideLiveApp()) {
            return '🗺️ <strong>Χάρτες</strong><br><br>' +
                'Στην ενότητα «Χάρτες» θα βρείτε χρήσιμες πληροφορίες για την πρόσβαση ' +
                'προς το Ρίο και το Αντίρριο, καθώς και συνδέσμους πλοήγησης και χάρτες της περιοχής.' +
                '<br><br>🔗 <a href="' + CONFIG.links.mapsPage +
                '" target="_blank" rel="noopener noreferrer">Χάρτες</a><br><br>';
        }

        if (port === 'rio') {
            return '<strong>Πλοήγηση προς την προβλήτα Ρίου</strong><br><br>' +
                'Πατήστε τον παρακάτω σύνδεσμο για πλοήγηση προς την προβλήτα του Ρίου.' +
                '<br><br>🔗 <a href="' + CONFIG.links.mapsRio +
                '" target="_blank" rel="noopener noreferrer">Πλοήγηση προς Ρίο</a><br><br>';
        }

        if (port === 'ant') {
            return '<strong>Πλοήγηση προς την προβλήτα Αντιρρίου</strong><br><br>' +
                'Πατήστε τον παρακάτω σύνδεσμο για πλοήγηση προς την προβλήτα του Αντιρρίου.' +
                '<br><br>🔗 <a href="' + CONFIG.links.mapsAnt +
                '" target="_blank" rel="noopener noreferrer">Πλοήγηση προς Αντίρριο</a><br><br>';
        }

        return '<strong>Πλοήγηση προς τις προβλήτες</strong><br><br>' +
            '🔗 <a href="' + CONFIG.links.mapsRio +
            '" target="_blank" rel="noopener noreferrer">Πλοήγηση προς Ρίο</a><br><br>' +
            '🔗 <a href="' + CONFIG.links.mapsAnt +
            '" target="_blank" rel="noopener noreferrer">Πλοήγηση προς Αντίρριο</a><br><br>';
    }

    function answerLiveApp() {
        return '<strong>Rio-Antirrio Live</strong><br><br>' +
            'Επισκεφθείτε την εφαρμογή Rio-Antirrio Live για ενημέρωση σε πραγματικό χρόνο σχετικά με ' +
            'τα δρομολόγια, τον καιρό, τη θέση των πλοίων, την απόστασή σας από το πορθμείο ' +
            'και τον χρόνο που χρειάζεστε για να φτάσετε.<br><br>' +
            '🔗 <a href="' + CONFIG.liveAppUrl +
            '" target="_blank" rel="noopener noreferrer">Rio-Antirrio Live</a><br><br>';
    }

    function answerShipsDetails() {
        return '<strong>Στοιχεία Πλοίων</strong><br><br>' +
            'Δείτε πληροφορίες για τα πλοία που εξυπηρετούν τη γραμμή Ρίου–Αντιρρίου, ' +
            'όπως βασικά στοιχεία, χαρακτηριστικά και φωτογραφικό υλικό.' +
            '<br><br>🔗 <a href="' + CONFIG.links.shipsDetails +
            '" target="_blank" rel="noopener noreferrer">Στοιχεία Πλοίων</a><br><br>';
    }

    function answerLiveDepartures() {
        return '<strong>Live αναχωρήσεις:</strong><br><br>' +
            'Για ενημέρωση αναχωρήσεων σε πραγματικό χρόνο, επισκεφθείτε τη σχετική σελίδα.<br><br>' +
            '🔗 <a href="' + CONFIG.links.liveDepartures +
            '" target="_blank" rel="noopener noreferrer">Live Αναχωρήσεις</a>';
    }

    function answerFacebook() {
        return '<strong>Rio-Antirrio Ferries στο Facebook</strong><br><br>' +
            '🔗 <a href="' + CONFIG.links.facebook +
            '" target="_blank" rel="noopener noreferrer">Rio-Antirrio Ferries</a><br><br>';
    }

    function pickReply(list) {
        return list[
            Math.floor(Math.random() * list.length)
        ];
    }

    /* 17. SOCIAL — μία λειτουργία, πέντε μικροί τύποι απάντησης. */
    function answerSocial(userText) {
        const q = normalizeRawQuery(userText || '');

        if (/^(?:καλημερα|kalimera)$/.test(q)) {
            return 'Καλημέρα σας! Πώς μπορώ να σας βοηθήσω σχετικά με τη λειτουργία του πορθμείου Ρίου–Αντιρρίου;';
        }
        if (/^(?:καλησπερα|kalispera)$/.test(q)) {
            return 'Καλησπέρα σας! Πώς μπορώ να σας βοηθήσω σχετικά με τη λειτουργία του πορθμείου Ρίου–Αντιρρίου;';
        }
        if (/^(?:καληνυχτα|καλο βραδυ|kalinixta|kalinuxta|kalo vradi)$/.test(q)) {
            return 'Καληνύχτα σας! Είμαι εδώ για πληροφορίες σχετικά με τη λειτουργία του πορθμείου Ρίου–Αντιρρίου.';
        }
        if (/^(?:γεια|γεια σου|γεια σας|χαιρετε|geia|geia sou|geia sas|hello|hi)$/.test(q)) {
            return 'Γεια σας! Πώς μπορώ να σας βοηθήσω σχετικά με τη λειτουργία του πορθμείου Ρίου–Αντιρρίου;';
        }

        if (/^(?:ευχαριστω|ευχαριστω πολυ|σε ευχαριστω|να εισαι καλα|να ειστε καλα|euxaristo|euxaristo poli|na eisai kala|na eiste kala|thanks|thank you)$/.test(q)) {
            return 'Παρακαλώ! Είμαι εδώ για να σας δώσω πληροφορίες σχετικά με τη λειτουργία της γραμμής Ρίου–Αντιρρίου.';
        }

        if (/^(?:μπορω να ρωτησω|μπορω να ρωτησω κατι|να ρωτησω|να ρωτησω κατι|θελω να ρωτησω κατι|mporo na rotiso|mporo na rotiso kati|na rotiso|na rotiso kati|thelo na rotiso kati)$/.test(q)) {
            return 'Βεβαίως! Τι θα θέλατε να ρωτήσετε;';
        }

        if (/^(?:τελεια|μπραβο|ενταξει|καταλαβα|σωστα|teleia|bravo|entaxi|katalava|sosta|ok)$/.test(q)) {
            return pickReply([
                'Χαίρομαι που σας βοήθησα.',
                'Είμαι στη διάθεσή σας.',
                'Με χαρά.'
            ]);
        }

        if (/^(?:αντιο|τα λεμε|καλη συνεχεια|καλο ταξιδι|antio|ta leme|kali sinexeia|kalo taxidi|bye|goodbye)$/.test(q)) {
            return pickReply([
                'Καλή συνέχεια!',
                'Καλό ταξίδι και ασφαλή διαδρομή.',
                'Αντίο και καλό δρόμο.'
            ]);
        }

        if (/^(?:παρακαλω|parakalo)$/.test(q)) {
            return pickReply([
                'Με χαρά!',
                'Στη διάθεσή σας.',
                'Χαίρομαι που μπορώ να βοηθήσω.'
            ]);
        }

        return 'Στη διάθεσή σας.';
    }

    function answerAssistantCapabilities() {
        return '<strong>Rio-Antirrio Assistant</strong><br><br>' +
            'Μπορώ να σας βοηθήσω με πληροφορίες σχετικά με:<br><br>' +
            '• live αναχωρήσεις<br>' +
            '• κατάσταση λειτουργίας του πορθμείου (OPEN / CLOSE)<br>' +
            '• δρομολόγια πλοίων<br>' +
            '• τιμές ναύλου<br>' +
            '• θέση πλοίων<br>' +
            '• απόσταση από το σημείο επιβίβασης<br>' +
            '• εκτιμώμενο χρόνο άφιξης στο πορθμείο<br>' +
            '• πρόγνωση καιρού<br>' +
            '• τρέχοντα δεδομένα καιρού<br>' +
            '• στοιχεία επικοινωνίας<br><br>' +
            'Μπορώ να απαντήσω σε δεκάδες ερωτήσεις που αφορούν τη λειτουργία του πορθμείου και να σας δώσω χρήσιμες πληροφορίες, ώστε να οργανώσετε το ταξίδι σας χρησιμοποιώντας τα πλοία της γραμμής.<br><br>' +
            'Μπορείτε να γράψετε την ερώτησή σας, <strong>στα Ελληνικά ή σε Greeklish</strong>.<br><br>' +
            'Για πληροφορίες σχετικά με το <strong>Rio-Antirrio Assistant</strong>, το <strong>Rio-Antirrio Ferries</strong> και την εφαρμογή <strong>Rio-Antirrio Live</strong>, ρωτήστε:<br><br>' +
            '<strong>«Τι είναι ο Rio-Antirrio AI Assistant;»</strong>';
    }

    function answerAssistantAbout() {
        return '<strong>Σχετικά με την υπηρεσία</strong><br><br>' +
            'Η σελίδα <strong>Rio-Antirrio Ferries</strong>, η εφαρμογή <strong>Rio-Antirrio Live</strong> και ο ψηφιακός βοηθός <strong>Rio Ai Assistant</strong> αποτελούν <strong>ιδιωτική πρωτοβουλία ενημέρωσης του επιβατικού κοινού</strong> για το πορθμείο Ρίου–Αντιρρίου, <strong>χωρίς οποιουδήποτε είδους υποστήριξη, δέσμευση ή επίσημη σύνδεση με δημόσιο ή ιδιωτικό φορέα</strong>.<br><br>' +
            'Η λειτουργία τους έχει <strong>αποκλειστικά ενημερωτικό χαρακτήρα και δεν αποσκοπεί στην αποκόμιση οποιουδήποτε οικονομικού οφέλους από τους χρήστες</strong>.<br><br>' +
            'Γνώρισε το 🔗 <a href="' + CONFIG.links.assistantAbout + '" target="_blank" rel="noopener noreferrer"><strong>Rio Ai Assistant</strong></a><br><br>' +
            'Η υπηρεσία <strong>δεν αποτελεί επίσημη υπηρεσία των Λιμενικών Αρχών, ούτε εργαλείο ενημέρωσης ή εκπροσώπησης των πλοιοκτητριών εταιρειών</strong> που δραστηριοποιούνται στη γραμμή.<br><br>' +
            'Οι πληροφορίες παρέχονται για τη διευκόλυνση και ενημέρωση των επιβατών και <strong>δεν υποκαθιστούν την επίσημη ενημέρωση των αρμόδιων Λιμενικών Αρχών</strong>.<br><br>' +
            'Για επιβεβαίωση πληροφοριών σχετικά με τη λειτουργία της γραμμής ή έκτακτες μεταβολές, μπορείτε να επικοινωνείτε με το <strong>Λιμενικό Τμήμα Ρίου</strong>.<br><br>' +
            centeredPhoneHtml();
    }

    function answerScheduleUpdates() {
        return '<strong>Ενημέρωση Δρομολογίων</strong><br><br>' +
            'Οι live λειτουργίες της σελίδας <strong>Rio-Antirrio Ferries</strong> και της εφαρμογής ' +
            '<strong>Rio-Antirrio Live</strong> βασίζονται στο επίσημο πρόγραμμα δρομολογίων που εκδίδεται από τη Λιμενική Αρχή.<br><br>' +
            'Παρότι καταβάλλεται κάθε δυνατή προσπάθεια για την άμεση ενημέρωση των δεδομένων και την ακρίβεια των πληροφοριών, ' +
            'το <strong>Rio-Antirrio Ferries</strong> δεν φέρει ευθύνη για τυχόν αλλαγές ή τροποποιήσεις των δρομολογίων ' +
            'που ενδέχεται να προκύψουν λόγω καιρικών συνθηκών, τεχνικών βλαβών ή αποφάσεων των αρμόδιων λιμενικών αρχών.<br><br>' +
            'Για επιβεβαίωση της λειτουργίας της γραμμής και των ωρών αναχώρησης, επικοινωνήστε με το ' +
            '<strong>Λιμενικό Τμήμα Ρίου</strong>.<br><br>' + centeredPhoneHtml();
    }

    function answerCompanyContacts() {
        return '<strong>Επικοινωνία με πλοιοκτήτριες εταιρείες</strong><br><br>' +
            'Η σελίδα <strong>Rio-Antirrio Ferries</strong> και η εφαρμογή <strong>Rio-Antirrio Live</strong> ' +
            'δεν διαθέτουν στοιχεία επικοινωνίας των πλοιοκτητριών εταιρειών ή της κοινοπραξίας που εξυπηρετεί τη γραμμή.<br><br>' +
            'Επομένως, δεν είναι δυνατή η παροχή πληροφοριών σχετικά με τηλέφωνα, διευθύνσεις, e-mail ή άλλα στοιχεία επικοινωνίας ' +
            'για θέματα εργασίας ή άλλων εταιρικών υποθέσεων.';
    }

    function answerContacts() {
        return '<strong>Επικοινωνία και πληροφορίες</strong><br><br>' +
            'Για περισσότερες πληροφορίες, επικοινωνήστε με το Λιμενικό Τμήμα Ρίου.' +
            '<br><br>' + centeredPhoneHtml();
    }

    function answerHistory() {
        return '<strong>Ιστορικά Στοιχεία</strong><br><br>' +
            'Γνωρίστε την ιστορία της πορθμειακής γραμμής Ρίου–Αντιρρίου, ' +
            'από τα πρώτα χρόνια λειτουργίας της έως σήμερα, μέσα από ιστορικά ' +
            'στοιχεία, σημαντικά γεγονότα και αρχειακό υλικό.' +
            '<br><br>🔗 <a href="' + CONFIG.links.history +
            '" target="_blank" rel="noopener noreferrer">Ιστορικά Στοιχεία</a><br><br>';
    }

    function answerPhotos() {
        return '<strong>Φωτογραφίες Πλοίων</strong><br><br>' +
            'Στο Rio-Antirrio Ferries θα βρείτε πλούσιο φωτογραφικό υλικό, ' +
            'οργανωμένο σε θεματικές ενότητες — από το «Ρίο κάποτε» έως το ' +
            '«Ρίο σήμερα», καθώς και φωτογραφίες πλοίων και στιγμές από την ' +
            'πορθμειακή γραμμή.' +
            '<br><br>🔗 <a href="' + CONFIG.links.photos +
            '" target="_blank" rel="noopener noreferrer">Φωτογραφικό Αρχείο</a><br><br>';
    }

    function answerVideos() {
        return '<strong>Βίντεο Πλοίων</strong><br><br>' +
            'Στο Rio-Antirrio Ferries θα βρείτε βίντεο από τα πλοία, τη γραμμή και ' +
            'στιγμές από τη λειτουργία του πορθμείου Ρίου–Αντιρρίου.' +
            '<br><br>🔗 <a href="' + CONFIG.links.videos +
            '" target="_blank" rel="noopener noreferrer">Βίντεο</a><br><br>';
    }

    function answerSpecialVehicles() {
        return '<strong>Ειδικές κατηγορίες οχημάτων</strong><br><br>' +
            'Ορισμένα οχήματα που ανήκουν σε ειδική κατηγορία, όπως τροχόσπιτα, ' +
            'αυτοκινούμενα, Ι.Χ. με τρέιλερ και άλλες παρόμοιες περιπτώσεις, ' +
            'ενδέχεται να έχουν διαφορετική κατηγοριοποίηση και χρέωση, ανάλογα ' +
            'με τα χαρακτηριστικά τους.<br><br>' +
            'Για τη σωστή κατηγορία και το αντίστοιχο ναύλο, επικοινωνήστε με το ' +
            'Λιμενικό Τμήμα Ρίου ή ενημερωθείτε από υπεύθυνο μέλος του πληρώματος ' +
            'πριν από την επιβίβασή σας στο πλοίο.<br><br>' +
            centeredPhoneHtml();
    }

    function answerBridgeInfo() {
        return '<strong>Γέφυρα Ρίου–Αντιρρίου</strong><br><br>' +
            'Ο Rio Ai Assistant παρέχει πληροφορίες για το <strong>Πορθμείο Ρίου–Αντιρρίου</strong> και ό,τι σχετίζεται με τη λειτουργία των πλοίων, όπως ώρες δρομολογίων, τιμές ναύλου, προβλήτες εργασίας και καιρικές συνθήκες που μπορεί να επηρεάσουν το πορθμείο.<br><br>' +
            'Για <strong>τιμές διοδίων, οχήματα, εκπτωτικά προγράμματα και άλλες πληροφορίες σχετικά με τη Γέφυρα Ρίου–Αντιρρίου</strong>, παρακαλώ συμβουλευτείτε την επίσημη ιστοσελίδα της Γέφυρας.';
    }

    function answerAccessibleBoarding() {
        return '<strong>♿ Πρόσβαση &amp; εξυπηρέτηση ΑμεΑ</strong><br><br>' +
            'Για την εξυπηρέτηση επιβατών με αναπηρία ή μειωμένη κινητικότητα προβλέπεται συνδρομή κατά την πρόσβαση και τη μετακίνησή τους στο πλοίο.<br><br>' +
            'Επειδή οι δυνατότητες πρόσβασης μπορεί να διαφέρουν ανάλογα με το πλοίο που εκτελεί το συγκεκριμένο δρομολόγιο, για ειδικές ανάγκες επιβίβασης ή μετακίνησης συνιστάται να ενημερώνετε <strong>αρμόδιο μέλος του πληρώματος</strong> πριν από την επιβίβασή σας.<br><br>' +
            'Για πρόσθετες πληροφορίες μπορείτε επίσης να απευθύνεστε στις <strong>Λιμενικές Αρχές</strong>.';
    }

    function answerSpecialFareEligibility() {
        const reducedFarePrice = findPriceByTerms([
            'πολυτεκνικο αμεα',
            'πολυτεκνικο - αμεα',
            'πολυτεκνικο',
            'αμεα'
        ]);

        return '<strong>♿ Πολύτεκνοι / ΑμεΑ — Μειωμένο ναύλο</strong><br><br>' +
            'Οχήματα <strong>πολυτέκνων και ΑμεΑ</strong> δικαιούνται μειωμένο ναύλο υπό προϋποθέσεις, για τις οποίες μπορείτε να ενημερωθείτε είτε από τις <strong>Λιμενικές Αρχές</strong> είτε από <strong>αρμόδιο μέλος του πληρώματος</strong> πριν από την επιβίβασή σας. Η μειωμένη τιμή αφορά το <strong>όχημα</strong>, καθώς οι επιβάτες μεταφέρονται δωρεάν.<br><br>' +
            'Για την εφαρμογή του μειωμένου ναύλου μπορεί να ζητηθούν δικαιολογητικά που αποδεικνύουν ότι το όχημα ανήκει στη συγκεκριμένη κατηγορία.<br><br>' +
            'Σύμφωνα με την ισχύουσα νομοθεσία, οι <strong>τρίτεκνοι δεν υπάγονται στην κατηγορία των πολυτέκνων</strong>.<br><br>' +
            '<strong>Τρέχουσα τιμή μειωμένου ναύλου:</strong><br><br>' +
            (reducedFarePrice
                ? '♿ <strong>Πολυτεκνικό / ΑμεΑ: ' + escapeHtml(reducedFarePrice) + '</strong>'
                : '♿ <strong>Πολυτεκνικό / ΑμεΑ:</strong> Η τρέχουσα τιμή δεν είναι διαθέσιμη αυτή τη στιγμή.');
    }

    function answerPetsOnBoard() {
        return '<strong>Μεταφορά ζώων</strong><br><br>' +
            'Τα ζώα συντροφιάς, όπως σκύλοι, γάτες και μελωδικά πτηνά, μπορούν να μεταφέρονται στο πλοίο υπό προϋποθέσεις και σύμφωνα με την ισχύουσα νομοθεσία.<br><br>' +
            'Η μεταφορά οικόσιτων ή παραγωγικών ζώων δεν επιτρέπεται στη συγκεκριμένη πορθμειακή γραμμή.<br><br>' +
            'Για σχετική ενημέρωση, ειδικές περιπτώσεις και προϋποθέσεις μεταφοράς ζώου στο πλοίο, επικοινωνήστε με το <strong>Λιμενικό Τμήμα Ρίου</strong>.<br><br>' + centeredPhoneHtml();
    }

    function answerAssignedVesselUnavailable() {
        return '<strong>Η συγκεκριμένη πληροφορία δεν είναι διαθέσιμη</strong><br><br>' +
            'Η σελίδα <strong>Rio-Antirrio Ferries</strong>, η εφαρμογή <strong>Rio-Antirrio Live</strong> και ο <strong>Rio Ai Assistant</strong> δεν διαθέτουν πληροφορίες για το <strong>ποιο συγκεκριμένο πλοίο εκτελεί κάθε δρομολόγιο ή πόσα πλοία εργάζονται κάθε στιγμή</strong>, καθώς αυτά αφορούν την <strong>εσωτερική λειτουργία και επιχειρησιακή οργάνωση της γραμμής</strong>.';
    }

    function answerContinuousOperation(userText) {
        const query = normalizeRawQuery(userText || '') + ' ' + normalizeText(userText || '');
        const asksFirst = /(?:πρωτο|προτο|proto)/.test(query);
        const asksLast = /(?:τελευταιο|teleutaio)/.test(query);

        function edgeTime(schedule, wantLast) {
            const valid = (Array.isArray(schedule) ? schedule : [])
                .map(function (timeStr) {
                    const parsed = parseTime(timeStr);
                    return parsed ? { time: String(timeStr).trim(), total: parsed.total } : null;
                })
                .filter(Boolean)
                .sort(function (a, b) { return a.total - b.total; });
            if (!valid.length) return '';
            return wantLast ? valid[valid.length - 1].time : valid[0].time;
        }

        if (asksFirst || asksLast) {
            const wantLast = asksLast;
            const port = detectPort(userText || '');
            const rioTime = edgeTime(getScheduleArray('dRio'), wantLast);
            const antTime = edgeTime(getScheduleArray('dAnt'), wantLast);
            const label = wantLast ? 'Τελευταίο δρομολόγιο' : 'Πρώτο δρομολόγιο';
            let result = '<strong>' + label + ' — 24ωρη λειτουργία</strong><br><br>' +
                'Τα πλοία στο πορθμείο εκτελούν δρομολόγια όλο το 24ωρο, σύμφωνα με το πρόγραμμα, εκτός έκτακτων συνθηκών.';

            if (port === 'rio') {
                return result + '<br><br>• Από Ρίο: <strong>' + escapeHtml(rioTime || 'Μη διαθέσιμο') + '</strong>';
            }
            if (port === 'ant') {
                return result + '<br><br>• Από Αντίρριο: <strong>' + escapeHtml(antTime || 'Μη διαθέσιμο') + '</strong>';
            }
            return result +
                '<br><br>• Από Ρίο: <strong>' + escapeHtml(rioTime || 'Μη διαθέσιμο') + '</strong>' +
                '<br>• Από Αντίρριο: <strong>' + escapeHtml(antTime || 'Μη διαθέσιμο') + '</strong>';
        }

        const base =
            '<strong>Λειτουργία δρομολογίων</strong><br><br>' +
            'Τα πλοία στο πορθμείο εκτελούν δρομολόγια όλο το 24ωρο, σύμφωνα με ' +
            'τα προγραμματισμένα δρομολόγια, εκτός έκτακτων συνθηκών.';

        if (isInsideLiveApp()) {
            return base + '<br><br>Για λεπτομέρειες, ρωτήστε «Πρόγραμμα Δρομολογίων».';
        }

        return base +
            '<br><br><strong>Για περισσότερες πληροφορίες:</strong><br><br>' +
            '🔗 <a href="https://rio-antirrio.blogspot.com/2018/08/dromologia.html" target="_blank" rel="noopener noreferrer">Δρομολόγια Πλοίων</a><br><br>' +
            '🔗 <a href="' + CONFIG.links.liveDepartures + '" target="_blank" rel="noopener noreferrer">Live Αναχωρήσεις</a><br><br>' +
            '📱 <a href="' + CONFIG.liveAppUrl + '" target="_blank" rel="noopener noreferrer">Rio-Antirrio Live</a>';
    }

    function answerInstall() {
        if (!isInsideLiveApp()) {
            return '📲 <strong>Εγκατάσταση εφαρμογής:</strong><br><br>' +
                'Οι οδηγίες εγκατάστασης βρίσκονται μέσα στο Rio-Antirrio Live App.<br><br>' +
                '🔗 <a href="' + CONFIG.liveAppUrl +
                '" target="_blank" rel="noopener noreferrer">Live App και οδηγίες εγκατάστασης</a>';
        }

        return '<strong>Εγκατάσταση στην αρχική οθόνη:</strong><br><br>' +
            '<strong>iPhone / iPad:</strong><br>' +
            '1. Ανοίξτε τη σελίδα στο Safari.<br>' +
            '2. Πατήστε Κοινοποίηση.<br>' +
            '3. Επιλέξτε «Προσθήκη στην οθόνη αφετηρίας».<br><br>' +
            '<strong>Android:</strong><br>' +
            '1. Ανοίξτε τη σελίδα στον Chrome.<br>' +
            '2. Πατήστε τις τρεις τελείες (⋮).<br>' +
            '3. Επιλέξτε «Προσθήκη στην αρχική οθόνη».';
    }

    function getVisiblePageText() {
        const clone = document.body.cloneNode(true);

        [
            '#ai-chat-wrapper',
            'script',
            'style',
            'noscript',
            'svg',
            'iframe',
            '[hidden]',
            '[aria-hidden="true"]'
        ].forEach(function (selector) {
            clone.querySelectorAll(selector).forEach(function (element) {
                element.remove();
            });
        });

        return String(clone.innerText || '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function searchVisiblePage(userText) {
        const queryWords = normalizeText(userText)
            .split(' ')
            .filter(function (word) {
                return word.length >= 4;
            });

        if (!queryWords.length) return '';

        const pageText = getVisiblePageText();
        if (!pageText) return '';

        const sentences = pageText
            .split(/(?<=[.!;·?])\s+/)
            .map(function (sentence) {
                return sentence.trim();
            })
            .filter(function (sentence) {
                return sentence.length >= 30;
            });

        let best = null;

        sentences.forEach(function (sentence) {
            const normalizedSentence = normalizeText(sentence);
            let hits = 0;

            queryWords.forEach(function (word) {
                if (normalizedSentence.includes(word)) {
                    hits += 1;
                }
            });

            if (
                hits >= 2 &&
                (!best || hits > best.hits)
            ) {
                best = {
                    hits: hits,
                    sentence: sentence
                };
            }
        });

        if (!best) return '';

        const excerpt = best.sentence.length > 420
            ? best.sentence.slice(0, 420) + '…'
            : best.sentence;

        return '🔎 <strong>Βρήκα σχετική πληροφορία στην τρέχουσα σελίδα:</strong><br><br>' +
            escapeHtml(excerpt);
    }

    function answerFallback(userText) {
        /* Η αναζήτηση σελίδας είναι αποκλειστικά τελευταίο fallback. */
        const pageResult = searchVisiblePage(userText);

        if (pageResult) return pageResult;

        return '<strong>Δεν κατάλαβα την ερώτησή σας.</strong><br><br>' +
            'Παρακαλώ γίνετε λίγο πιο συγκεκριμένος, επικεντρώνοντας την ερώτησή σας ' +
            'στη λειτουργία του πορθμείου Ρίου–Αντιρρίου.<br><br>' +
            'Μπορείτε να ρωτήσετε για δρομολόγια, κατάσταση πορθμείου, καιρό, ' +
            'θέση πλοίων, τιμές ναύλων, πλοήγηση, υπολογισμό χρόνου για να φτάσετε στο σημείο επιβίβασης ' +
            'ή άλλες πληροφορίες σχετικά με τη γραμμή.<br><br>' +
            'Για να δείτε τι μπορεί να σας απαντήσει ο ψηφιακός βοηθός, ρωτήστε:<br><br>' +
            '<strong>«Τι ξέρεις;»</strong><br><br>' +
            'Για πληροφορίες σχετικά με την υπηρεσία, ρωτήστε:<br><br>' +
            '<strong>«Τι είναι ο Rio-Antirrio AI Assistant;»</strong>';
    }

    function closeChatWindowPreservingHistory(delayMs) {
        setTimeout(function () {
            const chatWindow = document.getElementById('ai-chat-window');
            const input = document.getElementById('aiInput');

            if (chatWindow) {
                chatWindow.style.display = 'none';
            }

            if (input) {
                input.blur();
            }
        }, Number(delayMs) || 800);
    }


    /* =========================================================
       07. BLOG AND APP ACTIONS
       ========================================================= */
    function openVesselPositionInApp() {
        if (!isInsideLiveApp()) return false;
        const box = document.getElementById('vessel-map-box');
        const hidden = !box || box.classList.contains('vessel-hidden');
        if (hidden && typeof window.toggleVesselMap === 'function') window.toggleVesselMap();
        else if (hidden) {
            const button = document.querySelector('.btn-vessel');
            if (button) button.click();
        }
        if (box) setTimeout(function () { box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 200);
        return true;
    }

    function openDistanceGpsInApp() {
        if (!isInsideLiveApp()) return false;
        const bar = document.getElementById('gps-status-bar');
        const visible = bar && getComputedStyle(bar).display !== 'none';
        if (!visible && typeof window.toggleGps === 'function') {
            const button = document.querySelector('.btn-gps');
            window.toggleGps(button || undefined);
        } else if (!visible) {
            const button = document.querySelector('.btn-gps');
            if (button) button.click();
        }
        if (bar) setTimeout(function () { bar.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 250);
        return true;
    }

    function openScheduleInApp() {
        if (!isInsideLiveApp()) return false;
        const content = document.getElementById('full-list-view');
        const visible = content && getComputedStyle(content).display !== 'none';
        if (!visible && typeof window.toggleSchedule === 'function') window.toggleSchedule();
        else if (!visible) {
            const header = document.querySelector('#main-schedule-app .schedule-header-main');
            if (header) header.click();
        }
        return true;
    }

    function openInstallInApp() {
        if (!isInsideLiveApp()) return false;
        const reveal = document.getElementById('instructions-reveal');
        const visible = reveal && getComputedStyle(reveal).display !== 'none';
        if (!visible) {
            const button = document.getElementById('btn-install');
            if (button) button.click();
        }
        return true;
    }

    function isGpsPendingText(value) {
        const n = normalizeText(value);

        const pendingPhrases = [
            'ληψη δεδομενων gps',
            'αναζητηση σηματος gps',
            'αναζητηση σηματος',
            'περιμενετε για σημα',
            'εντοπισμος θεσης',
            'εντοπισμος τοποθεσιας',
            'loading'
        ].map(normalizeText);

        return !n || pendingPhrases.some(function (phrase) {
            return n.includes(phrase);
        });
    }

    function readGpsTextLater(body) {
        const startedAt = Date.now();
        let lastText = '';

        const timer = setInterval(function () {
            const gpsText = getSafeText('gps-text', '');
            lastText = gpsText || lastText;

            if (!isGpsPendingText(gpsText)) {
                appendMessage(
                    body,
                    'bot',
                    '📡 <strong>Στοιχεία GPS:</strong><br><br>' + escapeHtml(gpsText)
                );

                clearInterval(timer);
                closeChatWindowPreservingHistory(4500);
                return;
            }

            if (Date.now() - startedAt >= CONFIG.gpsMaxWaitMs) {
                clearInterval(timer);

                appendMessage(
                    body,
                    'bot',
                    'Δεν βρέθηκε ακόμη σταθερό σήμα GPS. ' +
                    'Μείνετε σε ανοιχτό χώρο, ενεργοποιήστε την τοποθεσία και δοκιμάστε ξανά.' +
                    (lastText ? '<br><br><small>' + escapeHtml(lastText) + '</small>' : '')
                );
            }
        }, CONFIG.gpsPollInterval);
    }

    function performAppAction(intent, body, port) {
        if (
            isFerryClosed() &&
            CLOSE_BLOCKED_ACTIONS.has(intent)
        ) {
            return;
        }

        /*
         * Στο Blog δεν γίνεται αυτόματη μετάβαση.
         * Οι σχετικοί σύνδεσμοι εμφανίζονται μόνο μέσα στην απάντηση του chat.
         */
        if (!isInsideLiveApp()) return;
        if (intent === 'navigation') {
            return;
        }

        if (intent === 'vesselPosition') {
            if (openVesselPositionInApp()) {
                closeChatWindowPreservingHistory(4500);
            }
        } else if (intent === 'departurePoint') {
            if (openVesselPositionInApp()) {
                closeChatWindowPreservingHistory(4500);
            }
        } else if (intent === 'distanceGps' || intent === 'gps') {
            /* Μικρή καθυστέρηση UX: διαβάζεται το μήνυμα και μετά ανοίγει το GPS. */
            setTimeout(function () {
                if (openDistanceGpsInApp()) {
                    closeChatWindowPreservingHistory(4500);
                    readGpsTextLater(body);
                }
            }, 700);
        } else if (intent === 'schedule') {
            openScheduleInApp();
        } else if (intent === 'install') {
            openInstallInApp();
        }
    }

    function buildAnswer(intent, port, userText) {
        if (
            isFerryClosed() &&
            CLOSE_AWARE_INTENTS.has(intent)
        ) {
            return answerClosedOperation(
                intent,
                port,
                userText
            );
        }

        switch (intent) {
            case 'passengerFare': return answerPassengerFare();
            case 'fareOrDurationClarify': return answerFareOrDurationClarify();
            case 'tripDuration': return answerTripDuration();
            case 'payment': return answerPayment();
            case 'social': return answerSocial(userText);
            case 'assistantCapabilities': return answerAssistantCapabilities();
            case 'assistantAbout': return answerAssistantAbout();
            case 'holidayOperation':
                return answerHolidayOperation(userText) || answerStatus();
            case 'status': return answerStatus();
            case 'statusToday': return answerStatusToday(userText);
            case 'futureScheduleInfo': return answerFutureScheduleInfo();
            case 'frequency': return answerFrequency(userText);
            case 'continuousOperation': return answerContinuousOperation(userText);
            case 'bridgeInfo': return answerBridgeInfo();
            case 'accessibleBoarding': return answerAccessibleBoarding();
            case 'specialFareEligibility': return answerSpecialFareEligibility();
            case 'petsOnBoard': return answerPetsOnBoard();
            case 'assignedVesselUnavailable': return answerAssignedVesselUnavailable();
            case 'specialVehicles': return answerSpecialVehicles();
            case 'next': return answerNext(port, userText);
            case 'next3': return answerNext3(port);
            case 'nextHour': return answerNextHour(port);
            case 'schedule': return answerSchedule(port);
            case 'prices': return answerPrices(userText);
            case 'weather': return answerWeather();
            case 'forecast': return answerForecast();
            case 'vesselPosition': return answerVesselPosition(userText);
            case 'departurePoint':
                return answerVesselPosition(userText);
            case 'distanceGps': return answerDistanceGps();
            case 'gps': return answerDistanceGps();
            case 'scheduleUpdates': return answerScheduleUpdates();
            case 'companyContacts': return answerCompanyContacts();
            case 'contacts': return answerContacts();
            case 'history': return answerHistory();
            case 'photos': return answerPhotos();
            case 'videos': return answerVideos();
            case 'install': return answerInstall();
            case 'navigation': return answerNavigation(port);
            case 'liveApp': return answerLiveApp();
            case 'shipsDetails': return answerShipsDetails();
            case 'liveDepartures': return answerLiveDepartures();
            case 'facebook': return answerFacebook();
            default: return answerFallback(userText);
        }
    }


    /* =========================================================
       08. MESSAGE DELIVERY AND INITIALIZATION
       ========================================================= */
    function smartScrollToMessage(body, messageEl) {
        if (!body || !messageEl) return;

        requestAnimationFrame(function () {
            const viewportHeight = body.clientHeight || 0;
            const messageHeight = messageEl.scrollHeight || messageEl.offsetHeight || 0;

            if (!viewportHeight || messageHeight <= viewportHeight * 0.45) {
                body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
                return;
            }

            /* Μεγάλη απάντηση: η αρχή της έρχεται ψηλά για φυσική ανάγνωση. */
            const topPadding = messageHeight > viewportHeight * 0.90
                ? viewportHeight * 0.16
                : viewportHeight * 0.24;

            body.scrollTo({
                top: Math.max(0, messageEl.offsetTop - topPadding),
                behavior: 'smooth'
            });
        });
    }

    function appendMessage(body, className, html, id) {
        const div = document.createElement('div');
        div.className = 'ai-msg ' + className;
        if (id) div.id = id;
        div.innerHTML = html;
        body.appendChild(div);
        body.scrollTop = body.scrollHeight;
        return div;
    }

    function readChatMemory() {
        try {
            const raw = localStorage.getItem(CHAT_MEMORY_KEY);
            if (!raw) return [];

            const saved = JSON.parse(raw);
            if (
                !saved ||
                !Array.isArray(saved.messages) ||
                !Number.isFinite(saved.updatedAt) ||
                Date.now() - saved.updatedAt > CHAT_MEMORY_TTL_MS
            ) {
                localStorage.removeItem(CHAT_MEMORY_KEY);
                return [];
            }

            return saved.messages.slice(-CHAT_MEMORY_MAX_PAIRS * 2);
        } catch (_error) {
            return [];
        }
    }

    function writeChatMemory(messages) {
        try {
            localStorage.setItem(
                CHAT_MEMORY_KEY,
                JSON.stringify({
                    updatedAt: Date.now(),
                    messages: messages.slice(-CHAT_MEMORY_MAX_PAIRS * 2)
                })
            );
        } catch (_error) {
            /* Η λειτουργία του chat συνεχίζεται και χωρίς localStorage. */
        }
    }

    function saveConversationFromDom() {
        const body = document.getElementById('aiChatBody');
        if (!body) return;

        const messages = Array.from(body.querySelectorAll('.ai-msg.user, .ai-msg.bot'))
            .filter(function (node) {
                return !node.id || !node.id.startsWith('loading-');
            })
            .map(function (node) {
                return {
                    role: node.classList.contains('user') ? 'user' : 'bot',
                    html: node.innerHTML
                };
            });

        /* Δεν αποθηκεύουμε το αρχικό μήνυμα υποδοχής ως ιστορικό. */
        const withoutWelcome = messages.length && messages[0].role === 'bot'
            ? messages.slice(1)
            : messages;

        writeChatMemory(withoutWelcome);
    }

    function restoreConversation() {
        const body = document.getElementById('aiChatBody');
        if (!body) return;

        const messages = readChatMemory();
        if (!messages.length) return;

        body.innerHTML = '';
        messages.forEach(function (message) {
            appendMessage(
                body,
                message.role === 'user' ? 'user' : 'bot',
                message.html
            );
        });
        requestAnimationFrame(function () {
            body.scrollTop = body.scrollHeight;
            setTimeout(function () {
                body.scrollTop = body.scrollHeight;
            }, 60);
        });
    }

    function resetConversation() {
        try {
            localStorage.removeItem(CHAT_MEMORY_KEY);
        } catch (_error) {}

        state.lastIntent = null;
        state.lastPort = null;

        const body = document.getElementById('aiChatBody');
        if (body) {
            body.innerHTML =
                '<div class="ai-msg bot">Είμαι ο Rio Ai Assistant. Πώς μπορώ να σας βοηθήσω σχετικά με το πορθμείο;</div>';
        }

        const input = document.getElementById('aiInput');
        if (input) {
            input.value = '';
            input.blur();
        }
    }


    window.handleAIKey = function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            window.sendAIMessage();
        }
    };

    function resolveIntentForMessage(userText) {
        const explicitPort = detectOriginPort(userText) || detectPort(userText);
        const normalized = normalizeText(userText);
        const specificScheduleTime = hasSpecificScheduleTimeRequest(userText);
        let port = explicitPort;
        let intent = detectIntent(userText);

        if (
            !port &&
            (
                normalized === 'και απο ριο' ||
                normalized === 'απο ριο' ||
                normalized.includes('και απο ριο')
            )
        ) {
            port = 'rio';
            intent = state.lastIntent || 'next';
        }

        if (
            !port &&
            (
                normalized === 'και απο αντιρριο' ||
                normalized === 'απο αντιρριο' ||
                normalized.includes('και απο αντιρριο')
            )
        ) {
            port = 'ant';
            intent = state.lastIntent || 'next';
        }

        if (!intent && port && state.lastIntent) {
            intent = state.lastIntent;
        }

        if (specificScheduleTime && !explicitPort) {
            port = null;
        }

        if (specificScheduleTime) {
            intent = 'next';
        }

        return { intent: intent, port: port };
    }

    window.sendAIMessage = async function () {
        const input = document.getElementById('aiInput');
        const body = document.getElementById('aiChatBody');

        if (!input || !body) return;

        const rawUserText = input.value.trim();

        if (!rawUserText) return;

        appendMessage(
            body,
            'user',
            escapeHtml(rawUserText)
        );

        input.value = '';
        input.blur();
        input.disabled = true;

        const loadingEl = appendMessage(
            body,
            'bot',
            'Ελέγχω τα δεδομένα... ⏳',
            'loading-' + Date.now()
        );

        try {
            await loadLiveData();

            const resolved = resolveIntentForMessage(rawUserText);
            const intent = resolved.intent;
            const port = resolved.port;

            if (intent) state.lastIntent = intent;
            if (port) state.lastPort = port;

            await sleep(getThinkingDelay());

            loadingEl.innerHTML = buildAnswer(
                intent,
                port || null,
                rawUserText
            );
            loadingEl.removeAttribute('id');

            saveConversationFromDom();
            smartScrollToMessage(body, loadingEl);

            performAppAction(intent, body, port || null);
        } catch (error) {
            console.error(
                'Rio Local Chat error:',
                error
            );

            loadingEl.innerHTML =
                '⚠️ Παρουσιάστηκε προσωρινό πρόβλημα κατά την ανάγνωση των τοπικών δεδομένων.<br>' +
                'Παρακαλώ δοκιμάστε ξανά.';
        } finally {
            input.disabled = false;
            input.blur();
        }
    };

    function initializeChat() {
        const fab = document.getElementById('ai-chat-fab');
        const closeBtn = document.querySelector('#ai-chat-window .ai-header-close');
        const resetBtn = document.querySelector('#ai-chat-window .ai-header-reset');
        const sendBtn = document.getElementById('aiSendBtn');
        const input = document.getElementById('aiInput');

        if (fab) fab.addEventListener('click', toggleChatWindow);
        if (closeBtn) closeBtn.addEventListener('click', toggleChatWindow);
        if (resetBtn) resetBtn.addEventListener('click', resetConversation);
        if (sendBtn) sendBtn.addEventListener('click', window.sendAIMessage);
        if (input) input.addEventListener('keydown', window.handleAIKey);

        restoreConversation();
        updateStatusBadge();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeChat, { once: true });
    } else {
        initializeChat();
    }

    window.RioAIChatBot = {
        detectIntent: detectIntent,
        resolveIntentForMessage: resolveIntentForMessage,
        detectPort: detectPort,
        isFerryClosed: isFerryClosed,
        getFerryStatusInfo: getFerryStatusInfo,
        isInsideLiveApp: isInsideLiveApp,
        resetConversation: resetConversation,
        getStoredConversation: readChatMemory,
        reloadData: function () {
            return loadLiveData(true);
        },
        version: '1.0.0'
    };
})();
