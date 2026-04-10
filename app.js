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
    FOXTROT: ['FOXTROT', 'FOXTROTT', 'FOX TROT'],
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

  const SPOKEN_TO_CANONICAL = {};
  Object.entries(SPOKEN_VARIANTS).forEach(([canonical, variants]) => {
    variants.forEach((variant) => {
      SPOKEN_TO_CANONICAL[variant] = canonical;
    });
  });

  const LETTERS = Object.keys(NATO);
  const MAX_ERRORS = 3;
  const NAME_AUTO_STOP_SILENCE_MS = 3500;
  const LETTER_PHASE_DURATION_MS = 60000;

  const startScreen = document.getElementById('startScreen');
  const examScreen = document.getElementById('examScreen');
  const resultScreen = document.getElementById('resultScreen');

  const speechStatusPill = document.getElementById('speechStatusPill');
  const firstNameInput = document.getElementById('firstNameInput');
  const lastNameInput = document.getElementById('lastNameInput');
  const startExamBtn = document.getElementById('startExamBtn');
  const backToStartBtn = document.getElementById('backToStartBtn');
  const restartBtn = document.getElementById('restartBtn');
  const startLettersBtn = document.getElementById('startLettersBtn');
  const continueRow = document.getElementById('continueRow');

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

  const timerWrap = document.getElementById('timerWrap');
  const timerBar = document.getElementById('timerBar');

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
  let hardStopTimer = null;
  let timerAnimationFrame = null;

  let aggregatedFinalTranscript = '';
  let latestInterimTranscript = '';

  let nameTasks = [];
  let alphabetTasks = [];
  let errorCount = 0;
  let examResults = [];
  let currentPhase = 'name';
  let namePromptText = '';

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

  function clearHardStopTimer() {
    if (hardStopTimer) {
      clearTimeout(hardStopTimer);
      hardStopTimer = null;
    }
  }

  function clearAnimatedTimer() {
    if (timerAnimationFrame) {
      cancelAnimationFrame(timerAnimationFrame);
      timerAnimationFrame = null;
    }
  }

  function hideTimer() {
    timerWrap.classList.add('hidden');
    timerWrap.setAttribute('aria-hidden', 'true');
    timerBar.style.transform = 'scaleX(1)';
    clearAnimatedTimer();
    clearHardStopTimer();
  }

  function showTimer() {
    timerWrap.classList.remove('hidden');
    timerWrap.setAttribute('aria-hidden', 'false');
  }

  function startMinuteTimer() {
    showTimer();
    clearAnimatedTimer();
    clearHardStopTimer();

    const start = performance.now();

    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.max(0, 1 - elapsed / LETTER_PHASE_DURATION_MS);
      timerBar.style.transform = `scaleX(${progress})`;

      if (progress > 0) {
        timerAnimationFrame = requestAnimationFrame(animate);
      }
    };

    timerBar.style.transform = 'scaleX(1)';
    timerAnimationFrame = requestAnimationFrame(animate);

    hardStopTimer = setTimeout(() => {
      stopRecognition();
      finalizeAlphabetRecording();
    }, LETTER_PHASE_DURATION_MS);
  }

  function resetSpeechBuffers() {
    aggregatedFinalTranscript = '';
    latestInterimTranscript = '';
  }

  function buildNameTasks(firstName, lastName) {
    const fullName = `${firstName}${lastName}`;
    return fullName.split('').map((letter) => ({
      expectedLetter: letter,
      expectedWord: NATO[letter]
    }));
  }

  function buildAlphabetTasks() {
    return shuffle([...LETTERS]).map((letter) => ({
      expectedLetter: letter,
      expectedWord: NATO[letter]
    }));
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

  function getDetectedWords() {
    const combined = `${aggregatedFinalTranscript} ${latestInterimTranscript}`.trim();
    return tokenizeTranscript(combined);
  }

  function stopRecognition() {
    clearSilenceTimer();
    clearHardStopTimer();
    clearAnimatedTimer();

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

  function renderNamePhase() {
    currentPhase = 'name';
    phasePill.textContent = 'Name';
    progressPill.textContent = '1 / 2';
    errorsPill.textContent = `Fehler: ${errorCount} / ${MAX_ERRORS}`;

    exerciseTypeLabel.textContent = 'Prüfung';
    exerciseTitle.textContent = 'Buchstabiere deinen Namen';
    exerciseInstruction.textContent = 'Drücke auf die Aufnahmetaste und buchstabiere deinen ganzen Namen laut im NATO-Alphabet.';
    promptLetter.textContent = namePromptText;
    promptSubText.textContent = 'Gesamter Name in einem Durchgang';

    continueRow.classList.add('hidden');
    hideTimer();
    resetSpeechBuffers();
    setRecordingVisual(false);
    updateStatusLine('Bereit.');
  }

  function renderAlphabetPhase() {
    currentPhase = 'alphabet';
    phasePill.textContent = 'Alphabet';
    progressPill.textContent = '2 / 2';
    errorsPill.textContent = `Fehler: ${errorCount} / ${MAX_ERRORS}`;

    exerciseTypeLabel.textContent = 'Prüfung';
    exerciseTitle.textContent = 'Buchstabiere alle Buchstaben';
    exerciseInstruction.textContent = 'Drücke auf die Aufnahmetaste und sprich nun alle angezeigten Buchstaben in der Reihenfolge laut im NATO-Alphabet. Die Aufnahme läuft genau 1 Minute.';
    promptLetter.textContent = alphabetTasks.map((task) => task.expectedLetter).join(' ');
    promptSubText.textContent = 'Alle Buchstaben in dieser Reihenfolge, ohne Unterbrechung';

    continueRow.classList.add('hidden');
    resetSpeechBuffers();
    setRecordingVisual(false);
    updateStatusLine('Bereit.');
    showTimer();
    timerBar.style.transform = 'scaleX(1)';
  }

  function finalizeNameRecording() {
    const detectedWords = getDetectedWords();
    const expectedWords = nameTasks.map((task) => task.expectedWord);
    const detectedString = detectedWords.join(' ');
    const expectedString = expectedWords.join(' ');
    const isCorrect = detectedString === expectedString;

    examResults.push({
      type: 'name',
      label: namePromptText,
      expected: expectedString,
      detected: detectedString || '—',
      correct: isCorrect,
      phaseLabel: 'Name'
    });

    if (!isCorrect) {
      errorCount += 1;
    }

    errorsPill.textContent = `Fehler: ${errorCount} / ${MAX_ERRORS}`;

    if (errorCount > MAX_ERRORS) {
      showFinalResult(false);
      return;
    }

    updateStatusLine('Teil 1 beendet. Starte jetzt den Buchstaben-Test.');
    continueRow.classList.remove('hidden');
    hideTimer();
  }

  function finalizeAlphabetRecording() {
    const detectedWords = getDetectedWords();
    const expectedWords = alphabetTasks.map((task) => task.expectedWord);

    let phaseErrors = 0;

    expectedWords.forEach((expectedWord, index) => {
      const detectedWord = detectedWords[index] || '';
      const isCorrect = detectedWord === expectedWord;

      examResults.push({
        type: 'letter-sequence',
        label: alphabetTasks[index].expectedLetter,
        expected: expectedWord,
        detected: detectedWord || '—',
        correct: isCorrect,
        phaseLabel: 'Alphabet'
      });

      if (!isCorrect) {
        phaseErrors += 1;
      }
    });

    errorCount += phaseErrors;

    if (errorCount > MAX_ERRORS) {
      showFinalResult(false);
      return;
    }

    showFinalResult(true);
  }

  function startNameRecognition() {
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
          finalizeNameRecording();
        }, NAME_AUTO_STOP_SILENCE_MS);
      };

      recognition.onsoundend = () => {
        clearSilenceTimer();
        silenceTimer = setTimeout(() => {
          stopRecognition();
          finalizeNameRecording();
        }, NAME_AUTO_STOP_SILENCE_MS);
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

  function startAlphabetRecognition() {
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
        startMinuteTimer();
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
      };

      recognition.onerror = () => {
        stopRecognition();
        finalizeAlphabetRecording();
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
    hideTimer();

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
        <strong>Aufgabe ${index + 1}: ${item.label}</strong><br>
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

    namePromptText = `${first} ${last}`;
    nameTasks = buildNameTasks(first, last);
    alphabetTasks = buildAlphabetTasks();
    errorCount = 0;
    examResults = [];

    startScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    examScreen.classList.remove('hidden');

    renderNamePhase();
  }

  function backToStart() {
    stopRecognition();
    hideTimer();
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
      <p>Am Anfang gibst du deinen Vorname und Nachname ein. Dann drückst du auf Aufnahme und buchstabierst deinen ganzen Namen in einem Durchgang laut im NATO-Alphabet.</p>
    </div>

    <div class="card">
      <h2>Teil 2: Alle Buchstaben</h2>
      <p>Danach startest du den zweiten Teil mit einem Knopf. Jetzt siehst du alle Buchstaben in einer gemischten Reihenfolge. Du sprichst sie in genau dieser Reihenfolge laut im NATO-Alphabet.</p>
    </div>

    <div class="card">
      <h2>Eine Minute Zeit</h2>
      <p>Im zweiten Teil läuft die Aufnahme genau eine Minute lang. Der Balken zeigt dir, wie viel Zeit noch übrig ist. Am Schluss wird alles zusammen verglichen.</p>
    </div>

    <div class="card">
      <h2>Bestanden oder nicht?</h2>
      <p>Du darfst höchstens 3 Fehler machen. Nur dann bekommst du das Lösungswort.</p>
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

      if (currentPhase === 'name') {
        finalizeNameRecording();
      } else {
        finalizeAlphabetRecording();
      }
    } else {
      if (currentPhase === 'name') {
        startNameRecognition();
      } else {
        startAlphabetRecognition();
      }
    }
  });

  startLettersBtn.addEventListener('click', () => {
    renderAlphabetPhase();
  });

  openHelpBtn.addEventListener('click', openHelpWindow);
  openHelpBtnExam.addEventListener('click', openHelpWindow);

  updateSpeechAvailability();
  setRecordingVisual(false);
  updateStatusLine('Bereit.');
  hideTimer();
});
