// ===== AUDIO ENGINE =====
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let isMuted = false;

function playKeyDown() {
    if (isMuted) return;
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const t = audioCtx.currentTime;

    // Click noise burst
    const bufSize = audioCtx.sampleRate * 0.02;
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 8);
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buf;

    // Bandpass filter for mechanical sound
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3500 + Math.random() * 1500;
    bp.Q.value = 2;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    noise.connect(bp);
    bp.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start(t);
    noise.stop(t + 0.04);

    // Resonant click tone
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200 + Math.random() * 400, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.03);
    const oscGain = audioCtx.createGain();
    oscGain.gain.setValueAtTime(0.08, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(oscGain);
    oscGain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
}

function playKeyUp() {
    if (isMuted) return;
    if (!audioCtx) return;
    const t = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 600 + Math.random() * 200;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.025);
}

// Mute toggle
const muteBtn = document.getElementById('mute-toggle');
if (muteBtn) {
    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        muteBtn.innerText = isMuted ? '🔇' : '🔊';
    });
}

// ===== PASSAGES =====
const passages = [
    "The quick brown fox jumps over the lazy dog. Programming is the art of algorithm design and the craft of debugging errant code. To become a great developer, one must type quickly and accurately.",
    "A journey of a thousand miles begins with a single step. Keyboards are our brushes, and screens are our canvases. A skilled typist can code at the speed of thought without looking down.",
    "Innovation is not about ideas. It is about making ideas happen. The flow state is achieved when your typing seamlessly translates your thoughts into written words on the machine.",
    "Web development brings creativity and logic together. You sculpt with HTML, paint with CSS, and build engines with JavaScript. Perfect typing mechanics ensure you are never bottlenecked by input."
];

const codePassages = [
    "function debounce(func, wait) { let timeout; return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); }; }",
    "const fetchUser = async (id) => { try { const res = await fetch('/api/users/' + id); return await res.json(); } catch (e) { console.error(e); } };",
    "class LinkedList { constructor() { this.head = null; this.tail = null; } append(val) { const node = { val, next: null }; if (!this.head) this.head = node; else this.tail.next = node; this.tail = node; } }"
];

const shortPassages = [
    "The early bird catches the worm.",
    "Actions speak louder than words.",
    "A picture is worth a thousand words.",
    "Practice makes perfect."
];

// ===== UI NAVIGATION =====
const navLearning = document.getElementById('nav-learning');
const navPractice = document.getElementById('nav-practice');
const navCompanion = document.getElementById('nav-companion');

const secLearning = document.getElementById('learning-mode');
const secPractice = document.getElementById('practice-mode');
const secCompanion = document.getElementById('companion-mode');

navLearning.addEventListener('click', () => switchMode('learning'));
navPractice.addEventListener('click', () => switchMode('practice'));
navCompanion.addEventListener('click', () => switchMode('companion'));

let activeMode = 'learning';

function switchMode(mode) {
    activeMode = mode;

    navLearning.classList.remove('active');
    navPractice.classList.remove('active');
    navCompanion.classList.remove('active');

    secLearning.classList.add('hidden');
    secPractice.classList.add('hidden');
    secCompanion.classList.add('hidden');

    secLearning.classList.remove('active');
    secPractice.classList.remove('active');
    secCompanion.classList.remove('active');

    if (mode === 'learning') {
        navLearning.classList.add('active');
        secLearning.classList.remove('hidden');
        setTimeout(() => secLearning.classList.add('active'), 50);
        initLearningGame();
    } else if (mode === 'practice') {
        navPractice.classList.add('active');
        secPractice.classList.remove('hidden');
        setTimeout(() => secPractice.classList.add('active'), 50);
        initPracticeGame();
    } else {
        navCompanion.classList.add('active');
        secCompanion.classList.remove('hidden');
        setTimeout(() => secCompanion.classList.add('active'), 50);
        resetCompanionUI();
    }
}

// ===== TYPING CORE =====
class TypingGame {
    constructor(displayElementId) {
        this.displayElem = document.getElementById(displayElementId);
        this.reset();
    }

    reset(text = null) {
        this.text = text || passages[Math.floor(Math.random() * passages.length)];
        this.words = this.text.split(' ');
        this.currentWordIndex = 0;
        this.currentLetterIndex = 0;
        this.startTime = null;
        this.correctChars = 0;
        this.totalChars = 0;
        this.isFinished = false;
        this.renderText();
    }

    renderText() {
        this.displayElem.innerHTML = '';
        this.words.forEach((word, wIdx) => {
            const wordEl = document.createElement('div');
            wordEl.className = 'word';
            if (wIdx === 0) wordEl.classList.add('active');
            word.split('').forEach((char, cIdx) => {
                const charEl = document.createElement('span');
                charEl.className = 'letter';
                charEl.innerText = char;
                if (wIdx === 0 && cIdx === 0) charEl.classList.add('active-letter');
                wordEl.appendChild(charEl);
            });
            this.displayElem.appendChild(wordEl);
        });
    }

    handleKey(key) {
        if (this.isFinished) return null;
        if (!this.startTime) this.startTime = Date.now();

        const wordsEl = this.displayElem.children;
        const currentWordEl = wordsEl[this.currentWordIndex];
        const lettersEl = currentWordEl.children;

        if (key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta' || key === 'Tab' || key === 'Enter') return null;

        if (key === 'Backspace') {
            if (this.currentLetterIndex > 0) {
                if (this.currentLetterIndex < lettersEl.length) {
                    lettersEl[this.currentLetterIndex].classList.remove('active-letter');
                } else if (this.currentLetterIndex === lettersEl.length) {
                    const extraTags = currentWordEl.querySelectorAll('.extra');
                    if (extraTags.length > 0) {
                        currentWordEl.removeChild(extraTags[extraTags.length - 1]);
                        this.currentLetterIndex--;
                        if (currentWordEl.lastChild) currentWordEl.lastChild.classList.add('active-letter');
                        return this.getStats();
                    }
                }
                this.currentLetterIndex--;
                const prevLet = lettersEl[this.currentLetterIndex];
                const wasCorrect = prevLet.classList.contains('correct');
                if (wasCorrect) this.correctChars--;
                if (prevLet.classList.contains('correct') || prevLet.classList.contains('incorrect')) {
                    this.totalChars--;
                }
                prevLet.className = 'letter active-letter';
            }
            return this.getStats();
        }

        if (key === ' ') {
            if (this.currentLetterIndex === lettersEl.length || this.currentLetterIndex > 0) {
                currentWordEl.classList.remove('active');
                if (this.currentLetterIndex < lettersEl.length) {
                    lettersEl[this.currentLetterIndex].classList.remove('active-letter');
                    for (let i = this.currentLetterIndex; i < lettersEl.length; i++) {
                        lettersEl[i].classList.add('incorrect');
                        this.totalChars++;
                    }
                }
                this.currentWordIndex++;
                this.currentLetterIndex = 0;
                this.correctChars++;
                this.totalChars++;

                if (this.currentWordIndex >= this.words.length) {
                    this.isFinished = true;
                    return this.getStats();
                }
                const nextWordEl = wordsEl[this.currentWordIndex];
                nextWordEl.classList.add('active');
                nextWordEl.children[0].classList.add('active-letter');
            }
            return this.getStats();
        }

        if (this.currentLetterIndex < lettersEl.length) {
            const currentLet = lettersEl[this.currentLetterIndex];
            currentLet.classList.remove('active-letter');
            const expectedChar = currentLet.innerText;
            if (key === expectedChar) {
                currentLet.classList.add('correct');
                this.correctChars++;
            } else {
                currentLet.classList.add('incorrect');
            }
            this.totalChars++;
            this.currentLetterIndex++;
            if (this.currentLetterIndex < lettersEl.length) {
                lettersEl[this.currentLetterIndex].classList.add('active-letter');
            }
        } else {
            const extraEl = document.createElement('span');
            extraEl.className = 'letter incorrect extra';
            extraEl.innerText = key;
            currentWordEl.appendChild(extraEl);
            this.currentLetterIndex++;
            this.totalChars++;
        }
        return this.getStats();
    }

    getStats() {
        if (!this.startTime) return { wpm: 0, acc: 100, progress: 0 };
        const elapsedMin = (Date.now() - this.startTime) / 60000;
        const wpm = elapsedMin > 0 ? Math.round((this.correctChars / 5) / elapsedMin) : 0;
        const acc = this.totalChars > 0 ? Math.round((this.correctChars / this.totalChars) * 100) : 100;
        const totalTextChars = this.text.length;
        const currentTotalIdx = this.words.slice(0, this.currentWordIndex).join(' ').length + (this.currentWordIndex > 0 ? 1 : 0) + Math.min(this.currentLetterIndex, this.words[this.currentWordIndex] ? this.words[this.currentWordIndex].length : 0);
        const progress = Math.min((currentTotalIdx / totalTextChars) * 100, 100);
        return { wpm, acc, progress };
    }
}

// ===== FINGER TO KEY MAPPING (Standard Touch Typing) =====
const fingerNames = {
    'l-pinky': 'left pinky',
    'l-ring': 'left ring finger',
    'l-middle': 'left middle finger',
    'l-index': 'left index finger',
    'r-index': 'right index finger',
    'r-middle': 'right middle finger',
    'r-ring': 'right ring finger',
    'r-pinky': 'right pinky',
    'thumb': 'thumb',
    'l-thumb': 'left thumb',
    'r-thumb': 'right thumb'
};

// ===== FINGER INDICATION ENGINE (CSS DIV DOTS) =====
let _virtKeys = null;
function getActiveVirtKeys() {
    if (activeMode === 'learning') return document.querySelectorAll('#learning-mode .key');
    if (activeMode === 'companion') return document.querySelectorAll('#local-kb-container .key');
    return document.querySelectorAll('.key'); // fallback
}
Object.defineProperty(window, 'virtKeys', { 
    get: function() { return getActiveVirtKeys(); } 
});

// Map finger IDs to CSS div element IDs
const fingerDotMap = {
    'l-pinky': 'fd-l-pinky',
    'l-ring': 'fd-l-ring',
    'l-middle': 'fd-l-middle',
    'l-index': 'fd-l-index',
    'l-thumb': 'fd-l-thumb',
    'r-pinky': 'fd-r-pinky',
    'r-ring': 'fd-r-ring',
    'r-middle': 'fd-r-middle',
    'r-index': 'fd-r-index',
    'r-thumb': 'fd-r-thumb',
    'thumb': 'fd-r-thumb' // space bar defaults to right thumb
};

function clearAllFingerStates() {
    document.querySelectorAll('.finger-dot').forEach(el => {
        el.classList.remove('active', 'pressed');
    });
    document.querySelectorAll('.hand-wrapper').forEach(el => {
        el.classList.remove('active-hand');
    });
}

function indicateFinger(fingerId) {
    clearAllFingerStates();
    if (!fingerId) return;

    const dotId = fingerDotMap[fingerId];
    if (!dotId) return;

    const dotEl = document.getElementById(dotId);
    if (dotEl) {
        dotEl.classList.add('active');
        const wrapper = dotEl.closest('.hand-wrapper');
        if (wrapper) wrapper.classList.add('active-hand');
    }

    // For space bar, highlight both thumbs
    if (fingerId === 'thumb') {
        const leftThumb = document.getElementById('fd-l-thumb');
        if (leftThumb) {
            leftThumb.classList.add('active');
            const lWrapper = leftThumb.closest('.hand-wrapper');
            if (lWrapper) lWrapper.classList.add('active-hand');
        }
    }
}

function pressFingerAnimation(fingerId) {
    if (!fingerId) return;

    const dotId = fingerDotMap[fingerId];
    if (!dotId) return;

    const dotEl = document.getElementById(dotId);
    if (dotEl) {
        dotEl.classList.remove('active');
        dotEl.classList.add('pressed');
        setTimeout(() => {
            dotEl.classList.remove('pressed');
        }, 250);
    }

    // For space bar, animate both thumbs
    if (fingerId === 'thumb') {
        const leftThumb = document.getElementById('fd-l-thumb');
        if (leftThumb) {
            leftThumb.classList.remove('active');
            leftThumb.classList.add('pressed');
            setTimeout(() => {
                leftThumb.classList.remove('pressed');
            }, 250);
        }
    }
}


// ===== LESSON DATA =====
const lessonData = {
    letters: {
        'home-row':    { label: 'Home Row',   text: 'f j f j d k d k s l s l a ; a ; f j d k s l a ;' },
        'top-row':     { label: 'Top Row',    text: 'q w e r t y u i o p q w e r t y u i o p' },
        'bottom-row':  { label: 'Bottom Row', text: 'z x c v b n m z x c v b n m z x c v b n m' },
        'numbers':     { label: 'Numbers',    text: '1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0' }
    },
    words: {
        'easy':   { label: 'Easy',   text: 'the and for are but not you all can had her was one our out day get has him his how its let may new now old see way who did' },
        'medium': { label: 'Medium', text: 'apple bread chair dance flame green horse juice knife lemon mouse night ocean piano queen river stone train under voice water' },
        'hard':   { label: 'Hard',   text: 'abstract birthday chocolate dangerous elephant furniture gymnasium hurricane knowledge landscape mysterious photograph restaurant strawberry temperature understand' }
    },
    sentences: {
        'easy':   { label: 'Easy',   text: 'The cat sat on a mat. A big red dog ran fast. She likes to read books. He went to the park today.' },
        'medium': { label: 'Medium', text: 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. A wizard quickly joined the brave foxes.' },
        'hard':   { label: 'Hard',   text: 'Programming is the art of algorithm design and the craft of debugging errant code. To become a great developer one must type quickly and accurately without ever looking down at the keyboard.' }
    }
};

let currentCategory = 'letters';
let currentSubOption = 'home-row';
let learnSequence = "";
let learnIndex = 0;
const blocksContainer = document.getElementById('learning-blocks');
const suboptionsContainer = document.getElementById('lesson-suboptions');


// ===== LESSON CATEGORY + SUB-OPTION CLICK HANDLERS =====

function renderSuboptions(category) {
    suboptionsContainer.innerHTML = '';
    if (category === 'game') {
        suboptionsContainer.innerHTML = '';
        return;
    }
    const options = lessonData[category];
    if (!options) return;
    const keys = Object.keys(options);
    keys.forEach((key, idx) => {
        const pill = document.createElement('button');
        pill.className = 'suboption-pill';
        pill.textContent = options[key].label;
        pill.dataset.suboption = key;
        if (idx === 0) {
            pill.classList.add('active');
            currentSubOption = key;
        }
        pill.addEventListener('click', () => {
            suboptionsContainer.querySelectorAll('.suboption-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentSubOption = key;
            loadLesson();
        });
        suboptionsContainer.appendChild(pill);
    });
}

// Category tab click handlers
document.querySelectorAll('.lesson-category').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.lesson-category').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.dataset.category;

        if (currentCategory === 'game') {
            renderSuboptions('game');
            initGameMode();
        } else {
            renderSuboptions(currentCategory);
            loadLesson();
        }
    });
});

function loadLesson() {
    let stUI = document.getElementById('standard-learning-ui');
    let gmUI = document.getElementById('game-learning-ui');
    if (stUI) stUI.classList.remove('hidden');
    if (gmUI) gmUI.classList.add('hidden');

    const options = lessonData[currentCategory];
    if (!options || !options[currentSubOption]) return;

    learnSequence = options[currentSubOption].text;
    learnIndex = 0;
    renderLearningBlocks();
    highlightVirtualKey();
}


// ===== LEARNING GAME INITIALIZATION =====

function initLearningGame() {
    if (currentCategory === 'game') {
        renderSuboptions('game');
        initGameMode();
        return;
    }
    renderSuboptions(currentCategory);
    loadLesson();
}


// ===== RENDER LEARNING BLOCKS =====

function renderLearningBlocks() {
    blocksContainer.innerHTML = '';
    const visibleCount = 10;
    for (let i = 0; i < visibleCount; i++) {
        const charIdx = learnIndex + i;
        const block = document.createElement('div');
        block.className = 'learn-block';

        if (charIdx < learnSequence.length) {
            let char = learnSequence[charIdx];
            if (char === ' ') {
                block.innerHTML = '&nbsp;';
                block.style.opacity = '0.4';
            } else {
                block.innerHTML = char.toLowerCase();
            }
            if (i === 0) {
                block.classList.add('active');
                if (learnIndex === 0) {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'tooltip';
                    tooltip.innerText = 'Start Typing!';
                    block.appendChild(tooltip);
                }
            }
        } else {
            block.classList.add('empty');
        }
        blocksContainer.appendChild(block);
    }
}


// ===== HIGHLIGHT VIRTUAL KEY =====

function highlightVirtualKey() {
    virtKeys.forEach(k => {
        k.classList.remove('active-key');
    });

    if (learnIndex >= learnSequence.length) {
        clearAllFingerStates();
        return;
    }

    let expectedChar = learnSequence[learnIndex].toLowerCase();

    let targetKey = Array.from(virtKeys).find(k =>
        k.dataset.key === expectedChar || (expectedChar === ' ' && k.dataset.key === ' ')
    );

    if (targetKey) {
        targetKey.classList.add('active-key');
        let fingerClass = targetKey.dataset.finger;
        indicateFinger(fingerClass);
    }
}


// ===== HANDLE LEARNING KEY =====

function handleLearningKey(key) {
    if (learnIndex >= learnSequence.length) return;

    let expectedChar = learnSequence[learnIndex].toLowerCase();

    if (key.toLowerCase() === expectedChar) {
        let targetKey = Array.from(virtKeys).find(k =>
            k.dataset.key === expectedChar || (expectedChar === ' ' && k.dataset.key === ' ')
        );
        if (targetKey) {
            let fingerClass = targetKey.dataset.finger;
            pressFingerAnimation(fingerClass);
            targetKey.classList.add('pressed');
            setTimeout(() => targetKey.classList.remove('pressed'), 150);
        }

        learnIndex++;

        if (learnIndex >= learnSequence.length) {
            blockCompleteAnimation();
        } else {
            renderLearningBlocks();
            highlightVirtualKey();
        }
    } else {
        const firstBlock = blocksContainer.querySelector('.learn-block.active');
        if (firstBlock) {
            firstBlock.classList.add('incorrect');
            setTimeout(() => firstBlock.classList.remove('incorrect'), 300);
        }
    }
}

function blockCompleteAnimation() {
    blocksContainer.innerHTML = '<div class="learn-block active" style="width:auto;padding:0 1.5rem;font-size:1.2rem;">Complete!</div>';
    clearAllFingerStates();
    setTimeout(() => initLearningGame(), 2000);
}


// ===== PRACTICE MODE =====
let practiceGame;
let practiceTimerInterval;
let practiceTimeLeft = 60;

function initPracticeGame() {
    practiceGame = new TypingGame('practice-text-display');
    document.getElementById('practice-wpm').innerText = '0';
    document.getElementById('practice-acc').innerText = '100%';
    practiceTimeLeft = 60;
    document.getElementById('practice-time').innerText = '60s';
    if (practiceTimerInterval) clearInterval(practiceTimerInterval);
}

document.getElementById('btn-restart-practice').addEventListener('click', () => initPracticeGame());
document.getElementById('btn-next-practice').addEventListener('click', () => initPracticeGame());

// ===== COMPANION MODE =====
let peer, conn;
let isHost = false;
let compGame;

const peerConfig = {
    config: {
        'iceServers': [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ]
    }
};

const setupPanel = document.getElementById('companion-setup');
const racePanel = document.getElementById('companion-race');
const statusMsg = document.getElementById('connection-status');
const myProgressBar = document.getElementById('p1-progress');
const oppProgressBar = document.getElementById('p2-progress');
const resultsLayer = document.getElementById('race-results');

function resetCompanionUI() {
    setupPanel.classList.remove('hidden');
    document.getElementById('companion-modes-selection').classList.add('hidden');
    racePanel.classList.add('hidden');
    resultsLayer.classList.add('hidden');
    document.getElementById('room-id-container').classList.add('hidden');
    statusMsg.innerText = '';
    myProgressBar.style.width = '0%';
    oppProgressBar.style.width = '0%';
    if (peer) peer.destroy();
    peer = null;
    conn = null;

    // Inject keyboards if not already present
    let localKb = document.getElementById('local-kb-container');
    let remoteKb = document.getElementById('remote-kb-container');
    if (localKb && !localKb.querySelector('.keyboard-and-hands-wrapper')) {
        const template = document.querySelector('.keyboard-and-hands-wrapper').outerHTML;
        localKb.innerHTML += template.replace(/id="/g, 'id="loc-');
        remoteKb.innerHTML += template.replace(/id="/g, 'id="rem-');
    }
}

document.getElementById('btn-create-room').addEventListener('click', () => {
    isHost = true;
    statusMsg.innerText = "Initializing room...";
    peer = new Peer(peerConfig);
    peer.on('open', id => {
        document.getElementById('room-id-container').classList.remove('hidden');
        document.getElementById('host-room-id').innerText = id;
        statusMsg.innerText = "Waiting for companion...";
    });
    peer.on('connection', connection => {
        conn = connection;
        setupConnection();
    });
});

document.getElementById('btn-join-room').addEventListener('click', () => {
    const roomId = document.getElementById('join-room-id').value.trim();
    if (!roomId) return;
    isHost = false;
    statusMsg.innerText = "Connecting...";
    peer = new Peer(peerConfig);
    peer.on('open', () => {
        conn = peer.connect(roomId);
        setupConnection();
    });
});

function setupConnection() {
    conn.on('open', () => {
        statusMsg.innerText = "Connected!";
        setupPanel.classList.add('hidden');
        if (isHost) {
            document.getElementById('companion-modes-selection').classList.remove('hidden');
        } else {
            statusMsg.innerText = "Waiting for host to select a mode...";
        }
    });
    conn.on('data', data => {
        if (data.type === 'START') startCompanionRace(data.text, data.raceMode || 'typing');
        else if (data.type === 'START_ARCADE') startArcadeMode(data.gameMode);
        else if (data.type === 'PROGRESS') updateOpponentProgress(data.progress, data.wpm);
        else if (data.type === 'ARCADE_PROGRESS') {
            let prog = Math.min((data.score / 200) * 100, 100);
            updateOpponentProgress(prog, data.score);
            if (data.score >= 200) {
                activeMode = 'companion';
                showResults("Companion Won the Arcade Race!");
                if (gameInterval) clearInterval(gameInterval);
            }
        }
        else if (data.type === 'FINISH') handleOpponentFinish();
        else if (data.type === 'REMATCH') startCompanionRace(data.text, currentRaceMode);
        else if (data.type === 'SUDDEN_DEATH_LOSE') {
            if (activeMode === 'companion') {
                compGame.isFinished = true;
                showResults("Companion Made a Mistake! You Win!");
            }
        }
        else if (data.type === 'KEYSTROKE') {
            let remoteKeys = document.querySelectorAll('#remote-kb-container .key');
            let keyStr = data.key.toLowerCase();
            let remoteMatch = Array.from(remoteKeys).find(k => k.dataset.key === keyStr || (keyStr === ' ' && k.dataset.key === ' '));
            if (remoteMatch) {
                remoteMatch.classList.remove('remote-error', 'remote-correct');
                remoteMatch.classList.add(data.isError ? 'remote-error' : 'remote-correct');
                setTimeout(() => remoteMatch.classList.remove('remote-error', 'remote-correct'), 200);
            }
        }
    });
    conn.on('close', () => {
        alert("Companion disconnected!");
        resetCompanionUI();
    });
}

// Mode Selection Logic
document.querySelectorAll('.mode-select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (e.currentTarget.disabled) return;
        const mode = e.currentTarget.dataset.mode;
        if (['typing', 'code', 'sprint', 'sudden-death'].includes(mode)) {
            document.getElementById('companion-modes-selection').classList.add('hidden');
            let text;
            if (mode === 'code') text = codePassages[Math.floor(Math.random() * codePassages.length)];
            else if (mode === 'sprint') text = shortPassages[Math.floor(Math.random() * shortPassages.length)];
            else text = passages[Math.floor(Math.random() * passages.length)];
            
            conn.send({ type: 'START', text: text, raceMode: mode });
            startCompanionRace(text, mode);
        } else if (['falling', 'jumping', 'zigzag'].includes(mode)) {
            document.getElementById('companion-modes-selection').classList.add('hidden');
            conn.send({ type: 'START_ARCADE', gameMode: mode });
            startArcadeMode(mode);
        }
    });
});

let currentRaceMode = 'typing';

function startCompanionRace(textToUse = null, mode = 'typing') {
    currentRaceMode = mode;
    document.getElementById('companion-modes-selection').classList.add('hidden');
    setupPanel.classList.add('hidden');
    racePanel.classList.remove('hidden');
    resultsLayer.classList.add('hidden');
    myProgressBar.style.width = '0%';
    oppProgressBar.style.width = '0%';
    document.getElementById('p1-wpm').innerText = '0 WPM';
    document.getElementById('p2-wpm').innerText = '0 WPM';
    document.querySelector('.p1-car').style.left = '0%';
    document.querySelector('.p2-car').style.left = '0%';
    
    let splitContainer = document.querySelector('.split-screen-container');
    if (splitContainer) splitContainer.classList.remove('hidden');

    let text = textToUse;
    if (isHost && !text) {
        text = passages[Math.floor(Math.random() * passages.length)];
        conn.send({ type: 'START', text });
    }
    
    compGame = new TypingGame('companion-text-display');
    compGame.reset(text);
}

function startArcadeMode(mode) {
    document.getElementById('companion-modes-selection').classList.add('hidden');
    setupPanel.classList.add('hidden');
    racePanel.classList.remove('hidden');
    resultsLayer.classList.add('hidden');
    
    let splitContainer = document.querySelector('.split-screen-container');
    if (splitContainer) splitContainer.classList.add('hidden');
    
    let gmUI = document.getElementById('game-learning-ui');
    if (gmUI) {
        racePanel.insertBefore(gmUI, resultsLayer);
        gmUI.classList.remove('hidden');
    }
    
    myProgressBar.style.width = '0%';
    oppProgressBar.style.width = '0%';
    document.getElementById('p1-wpm').innerText = '0';
    document.getElementById('p2-wpm').innerText = '0';
    document.querySelector('.p1-car').style.left = '0%';
    document.querySelector('.p2-car').style.left = '0%';
    
    activeMode = 'companion-arcade';
    initGameMode(mode);
}

function updateOpponentProgress(prog, wpm) {
    oppProgressBar.style.width = prog + '%';
    document.querySelector('.p2-car').style.left = prog + '%';
    document.getElementById('p2-wpm').innerText = wpm + ' WPM';
}

function handleOpponentFinish() {
    if (!compGame.isFinished) showResults("Companion Won!");
}

function showResults(msg) {
    resultsLayer.classList.remove('hidden');
    document.getElementById('winner-announcement').innerText = msg;
}

document.getElementById('btn-rematch').addEventListener('click', () => {
    if (isHost) startCompanionRace(null, currentRaceMode);
    else document.getElementById('winner-announcement').innerText = "Waiting for Host...";
});

// ===== GLOBAL KEYDOWN / KEYUP HANDLER =====
document.addEventListener('keydown', e => {
    if (document.activeElement.tagName === 'INPUT') return;

    if (activeMode === 'learning') {
        playKeyDown();
        handleLearningKey(e.key);
        if (e.key === ' ' || e.key === 'Backspace') e.preventDefault();
        return;
    }

    let activeGame = activeMode === 'practice' ? practiceGame : compGame;

    if (activeGame && !activeGame.isFinished) {
        const ignoredKeys = ['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'Enter'];
        if (!ignoredKeys.includes(e.key)) {
            playKeyDown();

            // Animate the corresponding virtual key
            let activeKeys = getActiveVirtKeys();
            let matchKey = Array.from(activeKeys).find(k => k.dataset.key === e.key.toLowerCase());
            if (matchKey) {
                matchKey.classList.add('pressed');
                setTimeout(() => matchKey.classList.remove('pressed'), 150);

                // Highlight the correct finger on hand images
                let fingerClass = matchKey.dataset.finger;
                if (fingerClass) {
                    pressFingerAnimation(fingerClass);
                }
            }
        }

        // --- NETWORK SYNC FOR ERRORS ---
        if (activeMode === 'companion' && activeGame === compGame && conn && conn.open) {
            let activeWordEl = document.querySelector('#companion-text-display .word.active');
            let activeLetterEl = activeWordEl ? activeWordEl.querySelector('.active-letter') : null;
            
            let expectedChar = null;
            if (activeLetterEl) {
                expectedChar = activeLetterEl.innerText;
            } else if (activeWordEl) {
                // If there's an active word but no active letter, we are at the end of the word expecting a space.
                expectedChar = ' ';
            }

            let isError = false;
            if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta' && e.key !== 'Tab' && e.key !== 'Enter') {
                if (e.key === 'Backspace') isError = false;
                else isError = expectedChar ? (e.key !== expectedChar) : true;
                
                conn.send({ type: 'KEYSTROKE', key: e.key, isError });
            }
        }

        const stats = activeGame.handleKey(e.key);
        if (stats) {
            if (activeGame === practiceGame) {
                if (!practiceTimerInterval && activeGame.startTime) {
                    practiceTimerInterval = setInterval(() => {
                        practiceTimeLeft--;
                        if (practiceTimeLeft < 0) practiceTimeLeft = 0;
                        document.getElementById('practice-time').innerText = practiceTimeLeft + 's';
                        const curStats = activeGame.getStats();
                        document.getElementById('practice-wpm').innerText = curStats.wpm;
                        document.getElementById('practice-acc').innerText = curStats.acc + '%';
                        if (practiceTimeLeft === 0) {
                            clearInterval(practiceTimerInterval);
                            activeGame.isFinished = true;
                        }
                    }, 1000);
                }
                document.getElementById('practice-wpm').innerText = stats.wpm;
                document.getElementById('practice-acc').innerText = stats.acc + '%';
            } else if (activeGame === compGame) {
                if (currentRaceMode === 'sudden-death' && activeGame.totalChars > activeGame.correctChars) {
                    activeGame.isFinished = true;
                    if (conn && conn.open) conn.send({ type: 'SUDDEN_DEATH_LOSE' });
                    showResults("You Made a Mistake! Companion Wins!");
                } else {
                    myProgressBar.style.width = stats.progress + '%';
                    document.querySelector('.p1-car').style.left = stats.progress + '%';
                    document.getElementById('p1-wpm').innerText = stats.wpm + ' WPM';
                    if (conn && conn.open) conn.send({ type: 'PROGRESS', progress: stats.progress, wpm: stats.wpm });
                    if (activeGame.isFinished) {
                        if (conn && conn.open) conn.send({ type: 'FINISH' });
                        showResults("You Won!");
                    }
                }
            }
        }
        if (e.key === ' ' || e.key === 'Backspace') e.preventDefault();
    }
});

document.addEventListener('keyup', e => {
    if (document.activeElement.tagName === 'INPUT') return;
    const ignoredKeys = ['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'Enter'];
    if (!ignoredKeys.includes(e.key)) {
        playKeyUp();
    }
});

// ===== INIT =====
initLearningGame();

// ===== GAME MODE =====
let gameInterval;
let fallingWords = [];
let gameScore = 0;
let gameMissed = 0;
let gameModeType = 'falling';
const wordList = ["pink", "aesthetic", "typing", "master", "beautiful", "blush", "rose", "fast", "speed", "flow", "keyboard", "finger", "lesson", "learn", "race"];

function initGameMode(type = 'falling') {
    gameModeType = type;
    let stUI = document.getElementById('standard-learning-ui');
    let gmUI = document.getElementById('game-learning-ui');
    if (stUI) stUI.classList.add('hidden');
    if (gmUI) gmUI.classList.remove('hidden');

    document.getElementById('game-over-screen').classList.add('hidden');
    gameScore = 0;
    gameMissed = 0;
    updateGameStats();

    const gameArea = document.getElementById('game-area');
    if (gameArea) gameArea.innerHTML = '';
    fallingWords = [];

    let gInput = document.getElementById('game-input');
    if (gInput) { gInput.value = ''; gInput.focus(); }

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameTick, 50);
}

let gRestart = document.getElementById('btn-restart-game');
if (gRestart) gRestart.addEventListener('click', () => initGameMode(gameModeType));

function spawnWord() {
    const gameArea = document.getElementById('game-area');
    if (!gameArea) return;
    const word = wordList[Math.floor(Math.random() * wordList.length)];
    const el = document.createElement('div');
    el.className = gameModeType === 'jumping' ? 'jumping-word' : 'falling-word';
    el.innerText = word;
    const maxLeft = gameArea.clientWidth - 120;
    el.style.left = Math.max(10, Math.floor(Math.random() * maxLeft)) + 'px';
    
    let yPos, vy, vx = 0;
    if (gameModeType === 'jumping') {
        yPos = gameArea.clientHeight;
        el.style.top = yPos + 'px';
        vy = -12 - (gameScore * 0.04); // Jump up
    } else if (gameModeType === 'zigzag') {
        yPos = 0;
        el.style.top = yPos + 'px';
        vy = 1.5 + (gameScore * 0.05); // Fall down
        vx = (Math.random() > 0.5 ? 2 : -2) * (1 + gameScore * 0.02); // Zigzag
    } else {
        yPos = 0;
        el.style.top = yPos + 'px';
        vy = 1.5 + (gameScore * 0.05); // Fall down
    }
    
    gameArea.appendChild(el);
    fallingWords.push({ word, el, y: yPos, vy: vy, vx: vx });
}

let spawnTimer = 0;
function gameTick() {
    spawnTimer += 50;
    if (spawnTimer >= 2000 - Math.min(gameScore * 20, 1500)) {
        spawnWord();
        spawnTimer = 0;
    }
    const gameArea = document.getElementById('game-area');
    for (let i = fallingWords.length - 1; i >= 0; i--) {
        let fw = fallingWords[i];
        
        if (gameModeType === 'jumping') {
            fw.vy += 0.5; // Gravity
            fw.y += fw.vy;
        } else if (gameModeType === 'zigzag') {
            fw.y += fw.vy;
            let currentLeft = parseFloat(fw.el.style.left || 0);
            if (currentLeft <= 0 || currentLeft >= gameArea.clientWidth - 120) {
                fw.vx *= -1;
                fw.el.style.left = Math.max(0, Math.min(gameArea.clientWidth - 120, currentLeft)) + 'px';
            }
            fw.el.style.left = (currentLeft + fw.vx) + 'px';
        } else {
            fw.y += fw.vy; // Constant linear fall
        }
        
        fw.el.style.top = fw.y + 'px';
        
        // If it falls below screen (and is moving downwards to ignore initial jump positioning)
        if (gameArea && fw.y > gameArea.clientHeight + 10 && fw.vy > 0) {
            gameMissed++;
            gameArea.removeChild(fw.el);
            fallingWords.splice(i, 1);
            updateGameStats();
            if (gameMissed >= 5) endGame();
        }
    }
}

function updateGameStats() {
    let sEl = document.getElementById('game-score');
    let mEl = document.getElementById('game-missed');
    if (sEl) sEl.innerText = gameScore;
    if (mEl) mEl.innerText = gameMissed;
}

function endGame() {
    clearInterval(gameInterval);
    let gOver = document.getElementById('game-over-screen');
    if (gOver) gOver.classList.remove('hidden');
}

let gInput = document.getElementById('game-input');
if (gInput) {
    gInput.addEventListener('input', (e) => {
        let typed = e.target.value.trim().toLowerCase();
        let matchIdx = fallingWords.findIndex(fw => fw.word === typed);
        if (matchIdx !== -1) {
            playKeyDown();
            let fw = fallingWords.splice(matchIdx, 1)[0];
            const gameArea = document.getElementById('game-area');
            if (gameArea) gameArea.removeChild(fw.el);
            gameScore += 10;
            e.target.value = '';
            updateGameStats();
            
            // Sync logic for Companion Arcade modes
            if (activeMode === 'companion-arcade' && conn && conn.open) {
                let prog = Math.min((gameScore / 200) * 100, 100);
                myProgressBar.style.width = prog + '%';
                document.querySelector('.p1-car').style.left = prog + '%';
                document.getElementById('p1-wpm').innerText = gameScore;
                
                conn.send({ type: 'ARCADE_PROGRESS', score: gameScore });
                if (gameScore >= 200) {
                    activeMode = 'companion';
                    if (gameInterval) clearInterval(gameInterval);
                    showResults("You Won the Arcade Race!");
                }
            }
        }
    });
}
