// src/static/app.js

const apiBase = '/api';
let debateStarted = false;
let currentRound = 0;
let userMessages = [];

async function startDebate() {
  const input = document.getElementById("userInput").value.trim();
  if (!input) return;
  
  try {
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
    
    debateStarted = true;
    currentRound = data.round || 1;
    renderDebate(data.history);
    renderPRD(data.prd_state);
    document.getElementById("userInput").value = '';
    
    // Update UI to show round info
    updateRoundInfo();
    
  } catch (error) {
    console.error('Error starting debate:', error);
    alert("❌ Error starting debate.");
  }
}

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
  } else if (!debateStarted) {
    // Start debate if not started
    await startDebate();
  } else {
    // Continue debate with user input
    await continueDebateWithInput(input);
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

async function continueDebateWithInput(input) {
  userMessages.push(input);
  renderUserChat();
  await continueDebate(input);
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

async function continueDebate(mention = null) {
  if (!debateStarted) {
    alert("Please start the debate first.");
    return;
  }

  // Add loading indicator
  const debateContainer = document.getElementById("debateHistory");
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "p-2 mb-2 border rounded bg-info text-dark";
  loadingDiv.innerHTML = `<strong>🔄 Round ${currentRound + 1} in progress...</strong><br/>Agents are discussing...`;
  debateContainer.appendChild(loadingDiv);
  debateContainer.scrollTop = debateContainer.scrollHeight;

  try {
    const res = await fetch("/api/continue_debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mention })
    });

    // Remove loading indicator
    debateContainer.removeChild(loadingDiv);

    if (res.ok) {
      const data = await res.json();
      currentRound = data.round || currentRound + 1;
      renderDebate(data.history);
      renderPRD(data.prd_state, /*show=*/false);
      updateRoundInfo();
      
      if (data.done) {
        showCompletionMessage();
      }
    } else {
      const errorData = await res.json();
      alert(`❌ Error continuing debate: ${errorData.error || 'Unknown error'}`);
    }
  } catch (error) {
    // Remove loading indicator on error
    if (debateContainer.contains(loadingDiv)) {
      debateContainer.removeChild(loadingDiv);
    }
    console.error('Error continuing debate:', error);
    alert("❌ Network error continuing debate.");
  }
}

function updateRoundInfo() {
  // Add round info to the debate header
  const header = document.querySelector('.col-md-6:last-child h3');
  if (header && debateStarted) {
    header.textContent = `Agent Debate - Round ${currentRound}`;
  }
}

function showCompletionMessage() {
  const debateContainer = document.getElementById("debateHistory");
  const completionDiv = document.createElement("div");
  completionDiv.className = "p-3 mb-2 border rounded bg-success text-dark";
  completionDiv.innerHTML = `
    <strong>🎉 Debate Complete!</strong><br/>
    All agents have reached consensus. The PRD is ready for review and download.
  `;
  debateContainer.appendChild(completionDiv);
  debateContainer.scrollTop = debateContainer.scrollHeight;
}

function getAgentText(msg) {
  let rawText = '';
  
  if (typeof msg === 'string') {
    rawText = msg;
  } else if (msg && msg.text) {
    let textStr = msg.text;
    
    try {
      const parsed = JSON.parse(textStr);
      if (parsed.content && parsed.content.parts && parsed.content.parts[0] && parsed.content.parts[0].text) {
        rawText = parsed.content.parts[0].text;
      }
    } catch (e) {
      const textMatch = textStr.match(/'text':\s*['"](.*?)['"](?:\s*\})/);
      if (textMatch && textMatch[1]) {
        rawText = textMatch[1];
      } else {
        const textMatch2 = textStr.match(/'text':\s*['"]((?:[^'"\\]|\\.)*)['"][^}]*\}/);
        if (textMatch2 && textMatch2[1]) {
          rawText = textMatch2[1];
        }
      }
    }
  } else if (msg && msg.argument) {
    let argumentStr = msg.argument;
    try {
      const parsed = JSON.parse(argumentStr);
      if (parsed.text) {
        const innerParsed = JSON.parse(parsed.text);
        if (innerParsed.content && innerParsed.content.parts && innerParsed.content.parts[0]) {
          rawText = innerParsed.content.parts[0].text;
        }
      }
    } catch (e) {
      const textMatch = argumentStr.match(/"text":\s*"([^"]*(?:\\.[^"]*)*)"/);
      if (textMatch && textMatch[1]) {
        rawText = textMatch[1];
      }
    }
  }
  
  if (!rawText || rawText.length < 10) {
    return "";
  }
  
  return formatAgentText(rawText);
}

function formatAgentText(text) {
  if (!text || text.length < 5) {
    return "";
  }

  // Clean up escaped characters
  text = text.replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\\\/g, '\\')
            .replace(/\\t/g, ' ');

  // Remove JSON metadata from the end
  text = text.replace(/('\}],\s*'role':|"\}],\s*"role":).*$/s, '');
  text = text.replace(/('\},\s*'usage_metadata':|"\},\s*"usage_metadata":).*$/s, '');

  text = text.trim();

  // Format the agent type at the beginning
  text = text.replace(/^(As an?|I'm a|Being a)\s+(UX Designer|Data Scientist|Product Manager|Security Expert|Software Engineer|Business Analyst|Database Expert|Backend Developer|Frontend Developer)/gi, 
                     '<strong>$2 Perspective:</strong><br><br>');

  // Format section headers
  text = text.replace(/(Opening Argument|My (argument|concerns?|perspective)|Here's my|From a [A-Z][a-z]+( [A-Z][a-z]+)* perspective):\s*/gi, 
                     '<br><br><strong>$1:</strong><br>');

  text = text.replace(/(Recommendations?|Conclusions?|Key Points?|In summary|In short):\s*/gi, 
                     '<br><br><strong>$1:</strong><br>');

  // Format numbered points and bullet points
  text = text.replace(/(\d+\.\s+\*\*[^*]+\*\*)/g, '<br><br><strong>$1</strong>');
  text = text.replace(/^\*\s+\*\*([^*]+)\*\*/gm, '<br><br><strong>• $1:</strong>');
  
  // Convert regular bullet points
  text = text.replace(/\n\s*[\*\-\•]\s+(.+)/g, '<br>• $1');

  // Format bold/italic
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');

  // Handle line breaks
  text = text.replace(/\n{2,}/g, '<br><br>');
  text = text.replace(/\n/g, '<br>');

  // Clean up excessive breaks
  text = text.replace(/(<br>\s*){3,}/g, '<br><br>');
  text = text.replace(/^(<br>\s*)+|(<br>\s*)+$/g, '');

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
    roundBox.className = "p-3 mb-3 border rounded bg-dark-subtle text-light";
    
    const entries = Object.entries(round);
    if (entries.length === 0) {
      roundBox.innerHTML = `<strong>📍 Round ${i + 1}</strong><br/><em>No agent responses in this round</em>`;
    } else {
      // Create round header
      const roundHeader = `<div class="mb-2"><strong>📍 Round ${i + 1}</strong> <small class="text-muted">(${entries.length} agents participated)</small></div>`;
      
      // Create agent responses
      const agentResponses = entries.map(([agent, msg]) => {
        const agentText = getAgentText(msg);
        if (!agentText) return '';
        
        return `
          <div class="agent-response mb-3 p-2 border-start border-primary border-3">
            <div class="agent-header mb-1">
              <strong class="text-primary">${agent.replace(/_/g, ' ').toUpperCase()}</strong>
            </div>
            <div class="agent-content">${agentText}</div>
          </div>
        `;
      }).filter(response => response).join('');
      
      roundBox.innerHTML = roundHeader + agentResponses;
    }
    
    container.appendChild(roundBox);
  });
  
  container.scrollTop = container.scrollHeight;
}

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
    
    if (data.error) {
      alert("Error loading session: " + data.error);
      return;
    }
    
    renderDebate(data.history);
    renderPRD(data.prd_state);
    debateStarted = true;
    currentRound = data.round_number || data.history.length;
    updateRoundInfo();
    
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

let isJsonView = false;
async function togglePrdFormat() {
  if (!debateStarted) {
    alert("Please start a debate first.");
    return;
  }
  isJsonView = !isJsonView;
  if (isJsonView) {
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
      const content = document.getElementById('fullPrdContent');
      content.innerHTML = marked.parse(data.text); // Use marked or similar lib
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