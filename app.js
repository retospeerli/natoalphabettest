document.addEventListener('DOMContentLoaded', () => {
  const NATO = {
    A: 'ALFA',
    B: 'BRAVO',
    C: 'CHARLIE',
    D: 'DELTA',
    E: 'ECHO',
    F: 'FOXTROT',
    G: 'GOLF',
    H: 'HOTEL',
    I: 'INDIA',
    J: 'JULIETT',
    K: 'KILO',
    L: 'LIMA',
    M: 'MIKE',
    N: 'NOVEMBER',
    O: 'OSCAR',
    P: 'PAPA',
    Q: 'QUEBEC',
    R: 'ROMEO',
    S: 'SIERRA',
    T: 'TANGO',
    U: 'UNIFORM',
    V: 'VICTOR',
    W: 'WHISKEY',
    X: 'X-RAY',
    Y: 'YANKEE',
    Z: 'ZULU'
  };

  const SPOKEN_VARIANTS = {
    ALFA: ['ALFA', 'ALPHA'],
    BRAVO: ['BRAVO'],
    CHARLIE: ['CHARLIE', 'CHARLEY'],
    DELTA: ['DELTA'],
    ECHO: ['ECHO', 'ECO', 'EKO'],
    FOXTROT: ['FOXTROT', 'FOX TROT'],
    GOLF: ['GOLF', 'GULF'],
    HOTEL: ['HOTEL'],
    INDIA: ['INDIA'],
    JULIETT: ['JULIETT', 'JULIET', 'JULIETTE'],
    KILO: ['KILO'],
    LIMA: ['LIMA'],
    MIKE: ['MIKE'],
    NOVEMBER: ['NOVEMBER'],
    OSCAR: ['OSCAR', 'OSKAR'],
    PAPA: ['PAPA'],
    QUEBEC: ['QUEBEC', 'QUÉBEC'],
    ROMEO: ['ROMEO'],
    SIERRA: ['SIERRA'],
    TANGO: ['TANGO'],
    UNIFORM: ['UNIFORM'],
    VICTOR: ['VICTOR'],
    WHISKEY: ['WHISKEY', 'WHISKY'],
    'X-RAY': ['X-RAY', 'X RAY', 'XRAY'],
    YANKEE: ['YANKEE'],
    ZULU: ['ZULU']
  };

  const REVERSE_NATO = {};
  Object.entries(NATO).forEach(([char, word]) => {
    REVERSE_NATO[word] = char;
  });

  const SPOKEN_TO_CANONICAL = {};
  Object.entries(SPOKEN_VARIANTS).forEach(([canonical, variants]) => {
    variants.forEach((variant) => {
      SPOKEN_TO_CANONICAL[variant] = canonical;
    });
  });

  const LETTERS = Object.keys(NATO);
  const MAX_ERRORS = 3;
  const AUTO_STOP_SILENCE_MS = 3500;

  const startScreen = document.getElementById('startScreen');
  const examScreen = document.getElementById('examScreen');
  const resultScreen = document.getElementById('resultScreen');

  const speechStatusPill = document.getElementById('speechStatusPill');
  const firstNameInput = document.getElementById('firstNameInput');
  const lastNameInput = document.getElementById('lastNameInput');
  const startExamBtn = document.getElementById('startExamBtn');
  const backToStartBtn = document.getElementById('backToStartBtn');
  const restartBtn = document.getElementById('restartBtn');

  const openHelpBtn = document.getElementById('openHelpBtn');
  const openHelpBtnExam = document.getElementById('openHelpBtnExam');

  const phasePill = document.getElementById('phasePill');
  const progressPill = document.getElementById('progressPill');
  const errorsPill = document.getElementById('errorsPill');

  const exerciseTypeLabel = document.getElementById('exerciseTypeLabel');
  const exerciseTitle = document.getElementById('exerciseTitle');
  const exerciseInstruction = document.getElementById('exerciseInstruction');
  const promptLetter = document.getElementById('promptLetter');
  const promptSubText = document.getElementById('promptSubText');
  const recordBtn = document.getElementById('recordBtn');
  const statusLine = document.getElementById('statusLine');

  const resultTitle = document.getElementById('resultTitle');
  const resultSummary = document.getElementById('resultSummary');
  const resultList = document.getElementById('resultList');
  const solutionBox = document.getElementById('solutionBox');

  if (
    !speechStatusPill ||
    !firstNameInput ||
    !lastNameInput ||
    !startExamBtn ||
    !recordBtn
  ) {
    console.error('Wichtige DOM-Elemente fehlen.');
    return;
  }

  let SpeechRecognitionCtor = null;
  let recognitionSupported = false;
  let recognition = null;
  let recognitionRunning = false;
  let silenceTimer = null;

  let aggregatedFinalTranscript = '';
  let latestInterimTranscript = '';

  let examTasks = [];
  let currentTaskIndex = 0;
  let errorCount = 0;
  let examResults = [];

  function normalizeNameText(text) {
    return (text || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/Ä/g, 'AE')
      .replace(/Ö/g, 'OE')
      .replace(/Ü/g, 'UE')
      .replace(/ß/g, 'SS')
      .replace(/[^A-Z]/g, '');
  }

  function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function setRecordingVisual(isRecording) {
    recordBtn.classList.toggle('recording', isRecording);
    recordBtn.setAttribute('aria-pressed', isRecording ? 'true' : 'false');
    recordBtn.textContent = isRecording ? 'Aufnahme läuft' : 'Aufnahme';
  }

  function updateStatusLine(text) {
    statusLine.textContent = text;
  }

  function clearSilenceTimer() {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  }

  function resetSpeechBuffers() {
    aggregatedFinalTranscript = '';
    latestInterimTranscript = '';
  }

  function buildNameTasks(firstName, lastName) {
    const fullName = `${firstName}${lastName}`;
    return fullName.split('').map((letter, index) => ({
      expectedLetter: letter,
      expectedWord: NATO[letter],
      phaseLabel: 'Name',
      promptSub: `Buchstabe ${index + 1} aus deinem Namen`
    }));
  }

  function buildAlphabetTasks() {
    return shuffle([...LETTERS]).map((letter) => ({
      expectedLetter: letter,
      expectedWord: NATO[letter],
      phaseLabel: 'Alphabet',
      promptSub: 'Einzelner Buchstabe'
    }));
  }

  function updateHeader() {
    const task = examTasks[currentTaskIndex];
    phasePill.textContent = task.phaseLabel;
    progressPill.textContent = `${currentTaskIndex + 1} / ${examTasks.length}`;
    errorsPill.textContent = `Fehler: ${errorCount} / ${MAX_ERRORS}`;
  }

  function renderTask() {
    const task = examTasks[currentTaskIndex];

    updateHeader();
    exerciseTypeLabel.textContent = 'Prüfung';
    exerciseTitle.textContent = 'Sprich den NATO-Begriff';
    exerciseInstruction.textContent = 'Drücke auf die Aufnahmetaste und sprich genau einen passenden NATO-Begriff.';
    promptLetter.textContent = task.expectedLetter;
    promptSubText.textContent = task.promptSub;

    resetSpeechBuffers();
    setRecordingVisual(false);
    updateStatusLine('Bereit.');
  }

  function tokenizeTranscript(transcript) {
    const cleaned = (transcript || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/X RAY/g, 'X-RAY')
      .replace(/FOX TROT/g, 'FOXTROT');

    const rawTokens = cleaned.split(/\s+/).filter(Boolean);
    const tokens = [];

    for (let i = 0; i < rawTokens.length; i += 1) {
      const one = rawTokens[i];
      const two = i < rawTokens.length - 1 ? `${rawTokens[i]} ${rawTokens[i + 1]}` : null;

      if (two && SPOKEN_TO_CANONICAL[two]) {
        tokens.push(SPOKEN_TO_CANONICAL[two]);
        i += 1;
        continue;
      }

      if (SPOKEN_TO_CANONICAL[one]) {
        tokens.push(SPOKEN_TO_CANONICAL[one]);
      }
    }

    return tokens;
  }

  function getDetectedCanonicalWord() {
    const combined = `${aggregatedFinalTranscript} ${latestInterimTranscript}`.trim();
    const tokens = tokenizeTranscript(combined);
    return tokens.length ? tokens[tokens.length - 1] : '';
  }

  function stopRecognition() {
    clearSilenceTimer();

    if (recognition) {
      try {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onspeechstart = null;
        recognition.onsoundstart = null;
        recognition.onspeechend = null;
        recognition.onsoundend = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.stop();
      } catch (error) {
        try {
          recognition.abort();
        } catch (abortError) {
          /* ignore */
        }
      }
    }

    recognition = null;
    recognitionRunning = false;
    setRecordingVisual(false);
  }

  function finalizeCurrentRecording() {
    const task = examTasks[currentTaskIndex];
    const detectedWord = getDetectedCanonicalWord();
    const isCorrect = detectedWord === task.expectedWord;

    examResults.push({
      letter: task.expectedLetter,
      expected: task.expectedWord,
      detected: detectedWord || '—',
      correct: isCorrect,
      phaseLabel: task.phaseLabel
    });

    if (!isCorrect) {
      errorCount += 1;
    }

    if (errorCount > MAX_ERRORS) {
      showFinalResult(false);
      return;
    }

    currentTaskIndex += 1;

    if (currentTaskIndex >= examTasks.length) {
      showFinalResult(true);
      return;
    }

    renderTask();
  }

  function startRecognition() {
    if (!recognitionSupported || !SpeechRecognitionCtor) {
      updateStatusLine('Spracherkennung nicht verfügbar.');
      return;
    }

    stopRecognition();
    resetSpeechBuffers();

    try {
      recognition = new SpeechRecognitionCtor();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        recognitionRunning = true;
        setRecordingVisual(true);
        updateStatusLine('');
      };

      recognition.onresult = (event) => {
        let finalPart = '';
        let interimPart = '';

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const transcript = event.results[i][0].transcript || '';
          if (event.results[i].isFinal) {
            finalPart += `${transcript} `;
          } else {
            interimPart += `${transcript} `;
          }
        }

        if (finalPart.trim()) {
          aggregatedFinalTranscript = `${aggregatedFinalTranscript} ${finalPart}`.trim();
        }

        latestInterimTranscript = interimPart.trim();
        clearSilenceTimer();
      };

      recognition.onspeechstart = () => {
        clearSilenceTimer();
      };

      recognition.onsoundstart = () => {
        clearSilenceTimer();
      };

      recognition.onspeechend = () => {
        clearSilenceTimer();
        silenceTimer = setTimeout(() => {
          stopRecognition();
          finalizeCurrentRecording();
        }, AUTO_STOP_SILENCE_MS);
      };

      recognition.onsoundend = () => {
        clearSilenceTimer();
        silenceTimer = setTimeout(() => {
          stopRecognition();
          finalizeCurrentRecording();
        }, AUTO_STOP_SILENCE_MS);
      };

      recognition.onerror = () => {
        stopRecognition();
        updateStatusLine('Aufnahme fehlgeschlagen. Bitte nochmals drücken.');
      };

      recognition.onend = () => {
        recognitionRunning = false;
        setRecordingVisual(false);
      };

      recognition.start();
    } catch (error) {
      stopRecognition();
      updateStatusLine('Aufnahme konnte nicht gestartet werden.');
    }
  }

  function showFinalResult(passedByCount) {
    stopRecognition();

    const passed = passedByCount && errorCount <= MAX_ERRORS;

    examScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');

    resultTitle.textContent = passed ? 'Prüfung bestanden' : 'Prüfung nicht bestanden';
    resultSummary.textContent = `Fehler: ${errorCount} von maximal ${MAX_ERRORS}.`;

    solutionBox.classList.toggle('hidden', !passed);

    resultList.innerHTML = '';
    examResults.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = `result-item ${item.correct ? 'good' : 'bad'}`;
      div.innerHTML = `
        <strong>Aufgabe ${index + 1}: ${item.letter}</strong><br>
        Bereich: ${item.phaseLabel}<br>
        Deine Antwort: ${item.detected}<br>
        Richtige Lösung: ${item.expected}
      `;
      resultList.appendChild(div);
    });
  }

  function startExam() {
    const first = normalizeNameText(firstNameInput.value);
    const last = normalizeNameText(lastNameInput.value);

    if (!first || !last) {
      alert('Bitte gib Vorname und Nachname ein.');
      return;
    }

    examTasks = [
      ...buildNameTasks(first, last),
      ...buildAlphabetTasks()
    ];

    currentTaskIndex = 0;
    errorCount = 0;
    examResults = [];

    startScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    examScreen.classList.remove('hidden');

    renderTask();
  }

  function backToStart() {
    stopRecognition();
    examScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    setRecordingVisual(false);
    updateStatusLine('Bereit.');
  }

  function openHelpWindow() {
    const win = window.open('', '_blank', 'width=760,height=820');
    if (!win) return;

    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Anleitung – NATO-Prüfung</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      background: #eef4ff;
      color: #142033;
    }
    .wrap {
      max-width: 760px;
      margin: 0 auto;
      padding: 24px;
    }
    .card {
      background: #fff;
      border: 1px solid #d8e3f2;
      border-radius: 18px;
      padding: 18px;
      box-shadow: 0 10px 28px rgba(18, 42, 84, 0.08);
      margin-bottom: 16px;
    }
    h1, h2, p {
      margin-top: 0;
    }
    .hint {
      color: #5b6b80;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>So funktioniert die Prüfung</h1>
      <p class="hint">Die Prüfung hat zwei Teile.</p>
    </div>

    <div class="card">
      <h2>Teil 1: Dein Name</h2>
      <p>Am Anfang gibst du deinen Vorname und Nachname ein. Danach zeigt dir die App die Buchstaben aus deinem Namen nacheinander. Zu jedem Buchstaben sprichst du den passenden NATO-Begriff.</p>
    </div>

    <div class="card">
      <h2>Teil 2: Alle Buchstaben</h2>
      <p>Danach kommen alle Buchstaben A bis Z einzeln. Die Reihenfolge ist gemischt. Auch hier sprichst du immer den passenden NATO-Begriff.</p>
    </div>

    <div class="card">
      <h2>So nimmst du auf</h2>
      <p>Drücke auf den Aufnahme-Button. Dann wird der Button rot. Das zeigt: Die Aufnahme läuft. Sprich deutlich. Die Aufnahme stoppt erst nach einer längeren Pause oder wenn du den Button nochmals drückst.</p>
    </div>

    <div class="card">
      <h2>Bestanden oder nicht?</h2>
      <p>Du darfst höchstens 3 Fehler machen. Nur dann bekommst du am Ende das Lösungswort.</p>
    </div>
  </div>
</body>
</html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function updateSpeechAvailability() {
    SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    recognitionSupported = Boolean(SpeechRecognitionCtor);
    speechStatusPill.textContent = recognitionSupported
      ? 'Spracherkennung verfügbar'
      : 'Spracherkennung nicht verfügbar';
  }

  startExamBtn.addEventListener('click', startExam);
  backToStartBtn.addEventListener('click', backToStart);
  restartBtn.addEventListener('click', backToStart);

  recordBtn.addEventListener('click', () => {
    if (recognitionRunning) {
      stopRecognition();
      finalizeCurrentRecording();
    } else {
      startRecognition();
    }
  });

  openHelpBtn.addEventListener('click', openHelpWindow);
  openHelpBtnExam.addEventListener('click', openHelpWindow);

  updateSpeechAvailability();
  setRecordingVisual(false);
  updateStatusLine('Bereit.');
});
