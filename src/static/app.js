// src/static/app.js

const apiBase = '/api';
let debateStarted = false;

let userMessages = [];


async function startDebate() {
  const input = document.getElementById("userInput").value.trim();
  if (!input) return;
  const res = await fetch("/api/start_debate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: input })
  });
  const data = await res.json();
  if (data.error) {
    alert("Error: " + data.error);
    return;
  }
  renderDebate(data.history);
  renderPRD(data.prd_state);
  document.getElementById("userInput").value = '';
}
// function renderUserChat() {
//   const container = document.getElementById("userChatHistory");
//   container.innerHTML = "";
//   if (userMessages.length === 0) {
//     container.innerHTML = '<div class="text-muted">No messages yet. Start a debate or ask something!</div>';
//     return;
//   }
//   userMessages.forEach(msg => {
//     const msgBox = document.createElement("div");
//     msgBox.className = "p-2 mb-2 border rounded bg-dark text-light text-end";
//     msgBox.innerHTML = `<span class="fw-bold">You:</span> ${msg}`;
//     container.appendChild(msgBox);
//   });
//   container.scrollTop = container.scrollHeight;
// }
async function sendMessage() {
  const input = document.getElementById("userInput").value.trim();
  if (!input) return;

  if (input.startsWith('@')) {
    // Agent chat (concise, doesn't affect debate)
    const match = input.match(/^@(\w+)\s*(.*)$/);
    if (match) {
      const agent = match[1];
      const question = match[2];
      await sendAgentChat(agent, question, input);
    }
  } else {
    // General LLM chat
    await sendLLMChat(input);
  }
  document.getElementById("userInput").value = '';
}

async function sendLLMChat(question) {
  userMessages.push(question);
  renderUserChat();
  try {
    const res = await fetch('/api/llm_chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    const data = await res.json();
    userMessages.push(data.answer);
    renderUserChat();
  } catch (error) {
    userMessages.push('❌ Error: LLM unavailable.');
    renderUserChat();
  }
}

async function sendAgentChat(agent, question, originalInput) {
  userMessages.push(originalInput);
  renderUserChat();
  try {
    const res = await fetch('/api/agent_chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent, question })
    });
    const data = await res.json();
    userMessages.push(data.answer);
    renderUserChat();
  } catch (error) {
    userMessages.push(`❌ Error: Agent ${agent} unavailable.`);
    renderUserChat();
  }
}

function renderUserChat() {
  const container = document.getElementById("userChatHistory");
  container.innerHTML = "";
  for (let i = 0; i < userMessages.length; i++) {
    const msg = userMessages[i];
    const isUser = i % 2 === 0; // user, then model, alternating
    const msgBox = document.createElement("div");
    msgBox.className = "p-2 mb-2 border rounded " + (isUser ? "bg-dark text-end" : "bg-secondary text-start");
    msgBox.innerHTML = isUser ? `<span class="fw-bold">You:</span> ${msg}` : `<span class="fw-bold">LLM/Agent:</span> ${msg}`;
    container.appendChild(msgBox);
  }
  container.scrollTop = container.scrollHeight;
}
async function continueDebate() {
  if (!debateStarted) {
    alert("Please start the debate first.");
    return;
  }
  const mention = document.getElementById("userInput").value.trim();
  if (mention) {
    userMessages.push(mention);
    renderUserChat();
  }
  document.getElementById('userInput').value = '';

  try {
    const res = await fetch("/api/continue_debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mention })
    });

    if (res.ok) {
      const data = await res.json();
      renderDebate(data.history);
      renderPRD(data.prd_state, /*show=*/false);
    } else {
      const errorData = await res.json();
      alert(`❌ Error continuing debate: ${errorData.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error continuing debate:', error);
    alert("❌ Network error continuing debate.");
  }
}

function getAgentText(msg) {
  if (typeof msg === 'string') return formatAgentText(msg);
  if (msg && msg.content && Array.isArray(msg.content.parts)) {
    return msg.content.parts
      .filter(part => 'text' in part)
      .map(part => formatAgentText(part.text))
      .join("<hr>");
  }
  return formatAgentText(JSON.stringify(msg));
}

// Improved Markdown-like formatter
function formatAgentText(text) {
  if (!text) return "";

  // Escape HTML special characters for safety
  text = text.replace(/[&<>"']/g, function(m) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m];
  });

  // Convert "**bold**" to <strong>
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Convert "*italic*" to <em>
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Convert bullet points and numbered lists to <ul>/<ol>
  // Numbered lists
  text = text.replace(/(?:^|\n)(\d+)\. (.+)/g, function(_, num, item) {
    return `<li>${item}</li>`;
  });
  // Bullet lists
  text = text.replace(/(?:^|\n)[\*\-] (.+)/g, function(_, item) {
    return `<li>${item}</li>`;
  });

  // Group consecutive <li> into <ul>
  text = text.replace(/(<li>[\s\S]+?<\/li>)/g, m =>
    `<ul>${m.replace(/(<li>[\s\S]+?<\/li>)/g, '$1')}</ul>`
  );

  // Section titles (e.g. "section_name:") to bold with spacing
  text = text.replace(/([a-zA-Z0-9_\\]+):\n/g, '<br><strong>$1:</strong><br>');
  // Analysis/Recommendations with bold
  text = text.replace(/(Analysis|Recommendations|Questions to Answer):/g, '<strong>$1:</strong>');

  // Turn double newlines into paragraph breaks
  text = text.replace(/\n{2,}/g, '<br><br>');
  // Turn single newlines into <br> but not after <ul>/<li>
  text = text.replace(/([^\n])\n([^\n])/g, '$1<br>$2');

  // Remove empty <ul></ul>
  text = text.replace(/<ul>\s*<\/ul>/g, '');

  return text;
}
function renderDebate(history) {
  const container = document.getElementById("debateHistory");
  container.innerHTML = "";
  if (!history || history.length === 0) {
    container.innerHTML = '<div class="text-muted">No debate history yet. Start a debate to see agent discussions here.</div>';
    return;
  }
  history.forEach((round, i) => {
    const roundBox = document.createElement("div");
    roundBox.className = "p-2 mb-2 border rounded bg-dark-subtle text-light";
    const entries = Object.entries(round);
    if (entries.length === 0) {
      roundBox.innerHTML = `<strong>Round ${i + 1}</strong><br/><em>No agent responses in this round</em>`;
    } else {
      roundBox.innerHTML = `<strong>Round ${i + 1}</strong><br/>` + entries.map(
        ([agent, msg]) => `<div class="mt-1"><strong>${agent}:</strong> <div class="agent-msg">${getAgentText(msg)}</div></div>`
      ).join("");
    }
    container.appendChild(roundBox);
  });
  container.scrollTop = container.scrollHeight;
}

// Only show PRD when toggled or in modal
function renderPRD(prd, show=false) {
  const view = document.getElementById('prdView');
  const container = document.getElementById('prdViewContainer');
  if (show && prd) {
    container.classList.remove('d-none');
    view.textContent = JSON.stringify(prd, null, 2);
  } else {
    container.classList.add('d-none');
    view.textContent = '';
  }
}
// // New function specifically for the send button
// async function sendMessage() {
//   const input = document.getElementById("userInput").value.trim();
//   if (!input) return;

//   if (!debateStarted) {
//     // If debate hasn't started, treat this as starting the debate
//     await startDebate();
//   } else {
//     // If debate is ongoing, continue the debate
//     await continueDebate();
//   }
// }

async function saveSession() {
  try {
    const res = await fetch('/api/save_debate', { method: 'POST' });
    const data = await res.json();
    alert(`✅ Session saved: ${data.session_id}`);
    loadSessionList();
  } catch (error) {
    console.error('Error saving session:', error);
    alert("❌ Error saving session.");
  }
}

async function loadSession() {
  const sessionId = document.getElementById('sessionSelect').value;
  if (!sessionId) return;
  
  try {
    const res = await fetch(`/api/load_debate/${sessionId}`);
    const data = await res.json();
    renderDebate(data.history);
    renderPRD(data.prd_state);
    debateStarted = true; // Mark debate as started when loading a session
  } catch (error) {
    console.error('Error loading session:', error);
    alert("❌ Error loading session.");
  }
}

async function loadSessionList() {
  try {
    const res = await fetch('/api/list_sessions');
    const data = await res.json();
    const select = document.getElementById('sessionSelect');
    select.innerHTML = '<option value="">-- Select a session --</option>';
    data.sessions.forEach(id => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = id;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error('Error loading session list:', error);
  }
}


function downloadPRD() {
  if (!debateStarted) {
    alert("Please start a debate first to generate a PRD.");
    return;
  }
  window.open(`${apiBase}/download_prd`, '_blank');
}
rt("Please start a debate first.");

let isJsonView = false;
async function togglePrdFormat() {
  if (!debateStarted) {
    alert("Please start a debate first.");
    return;
  }
  isJsonView = !isJsonView;
  if (isJsonView) {
    // Show PRD in the right panel
    const res = await fetch('/api/continue_debate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mention: '' })
    });
    if (res.ok) {
      const data = await res.json();
      renderPRD(data.prd_state, /*show=*/true);
    }
  } else {
    renderPRD(null, /*show=*/false);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById('fullPrdModal');
  modal.addEventListener('show.bs.modal', async () => {
    if (!debateStarted) {
      document.getElementById('fullPrdContent').textContent = 'No PRD data available. Please start a debate first.';
      return;
    }

    try {
      const res = await fetch('/api/prd_text');
      const data = await res.json();
      document.getElementById('fullPrdContent').textContent = data.text;
    } catch (error) {
      console.error('Error loading full PRD:', error);
      document.getElementById('fullPrdContent').textContent = 'Error loading PRD data.';
    }
  });

  // Add Enter key support for textarea
  const textarea = document.getElementById('userInput');
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
});
window.onload = () => {
  loadSessionList();
  renderUserChat();
};