:root {
  --bg: #eef4ff;
  --card: rgba(255, 255, 255, 0.96);
  --line: #d8e3f2;
  --text: #142033;
  --muted: #5b6b80;
  --blue: #2563eb;
  --blue-dark: #1d4ed8;
  --green: #15803d;
  --red: #c81e1e;
  --red-dark: #991b1b;
  --shadow: 0 18px 48px rgba(18, 42, 84, 0.12);
  --radius-xl: 24px;
  --radius-lg: 18px;
  --radius-md: 14px;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
}

body {
  font-family: Arial, Helvetica, sans-serif;
  color: var(--text);
  background:
    radial-gradient(circle at top left, #dceaff 0%, transparent 35%),
    linear-gradient(180deg, #edf4ff 0%, #f7fbff 100%);
}

button,
input {
  font: inherit;
}

.app-shell {
  width: min(1120px, calc(100% - 24px));
  margin: 20px auto 32px;
}

.screen {
  display: grid;
  gap: 18px;
}

.hidden {
  display: none !important;
}

.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  padding: 22px;
}

.hero {
  padding: 26px;
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--blue);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.78rem;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  font-size: clamp(2rem, 4vw, 3.1rem);
  line-height: 1.05;
  margin-bottom: 10px;
}

.lead {
  font-size: 1.05rem;
  max-width: 760px;
  color: var(--muted);
  margin-bottom: 0;
}

.status-row,
.topbar-pills,
.action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 999px;
  background: #edf4ff;
  color: #1743a8;
  font-weight: 700;
}

.icon-btn,
.primary-btn,
.ghost-btn,
.record-btn {
  border: none;
  border-radius: 16px;
  cursor: pointer;
  font-weight: 800;
}

.icon-btn {
  background: #eef4ff;
  color: #1743a8;
  padding: 12px 16px;
}

.primary-btn {
  background: linear-gradient(180deg, var(--blue) 0%, var(--blue-dark) 100%);
  color: #fff;
  padding: 14px 18px;
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.24);
}

.ghost-btn {
  background: #eaf1ff;
  color: #1743a8;
  padding: 14px 18px;
}

.form-card {
  display: grid;
  gap: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.field {
  display: grid;
  gap: 8px;
  font-weight: 700;
}

.field span {
  color: var(--muted);
}

.field input {
  border: 2px solid var(--line);
  border-radius: 14px;
  padding: 14px 16px;
  background: #fff;
  outline: none;
}

.field input:focus {
  border-color: var(--blue);
}

.topbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
}

@media (max-width: 920px) {
  .topbar {
    grid-template-columns: 1fr;
  }
}

.exam-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(260px, 0.7fr);
  gap: 18px;
}

@media (max-width: 920px) {
  .exam-layout {
    grid-template-columns: 1fr;
  }
}

.instruction {
  color: var(--muted);
}

.prompt-box {
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 22px;
  background: linear-gradient(180deg, #f9fbff 0%, #f3f8ff 100%);
  margin: 16px 0;
}

.prompt-main {
  font-size: clamp(4rem, 10vw, 7rem);
  font-weight: 900;
  line-height: 1;
  text-align: center;
}

.prompt-sub {
  margin-top: 10px;
  color: var(--muted);
  text-align: center;
  font-size: 1rem;
}

.recording-area {
  display: flex;
  justify-content: center;
  margin: 24px 0 16px;
}

.record-btn {
  min-width: 180px;
  min-height: 72px;
  padding: 16px 24px;
  background: #eaf1ff;
  color: #1743a8;
  font-size: 1.2rem;
}

.record-btn.recording {
  background: linear-gradient(180deg, var(--red) 0%, var(--red-dark) 100%);
  color: #fff;
  box-shadow: 0 0 0 0 rgba(200, 30, 30, 0.45);
  animation: pulse 1.2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(200, 30, 30, 0.45);
  }
  70% {
    box-shadow: 0 0 0 14px rgba(200, 30, 30, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(200, 30, 30, 0);
  }
}

.status-line {
  min-height: 1.4em;
  text-align: center;
  font-weight: 700;
  color: var(--muted);
}

.solution-box {
  border: 1px solid #c3ebd0;
  background: #f4fff7;
  border-radius: 18px;
  padding: 16px;
  margin: 18px 0;
}

.solution-label {
  color: var(--muted);
  font-size: 0.95rem;
  margin-bottom: 6px;
}

.solution-text {
  font-size: 1.25rem;
  font-weight: 900;
}

.result-list {
  display: grid;
  gap: 12px;
  margin: 18px 0;
}

.result-item {
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 14px;
  background: #fbfdff;
}

.result-item.good {
  border-color: #c3ebd0;
  background: #f4fff7;
}

.result-item.bad {
  border-color: #f2c1c1;
  background: #fff7f7;
}
