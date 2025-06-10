// src/static/app.js

const apiBase = '/api';

async function startDebate() {
    const topic = document.getElementById('topicInput').value;
    const res = await fetch(`${apiBase}/start_debate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic })
    });
    const data = await res.json();
    renderDebateHistory([data]);
}

async function continueDebate() {
    const res = await fetch(`${apiBase}/continue_debate`, { method: 'POST' });
    const data = await res.json();
    const currentHistory = await getDebateHistory();
    currentHistory.push(data);
    renderDebateHistory(currentHistory);
}

async function revisitTopic() {
    const res = await fetch(`${apiBase}/revisit_topic`, { method: 'POST' });
    const data = await res.json();
    renderDebateHistory([data]);
}

async function saveDebate() {
    const res = await fetch(`${apiBase}/save_debate`, { method: 'POST' });
    const data = await res.json();
    alert(`Debate saved! Session ID: ${data.session_id}`);
}

async function generatePRD() {
    // Placeholder for now
    alert("Generate PRD clicked! (Will implement this next)");
}

async function getDebateHistory() {
    const res = await fetch(`${apiBase}/get_debate_history`);
    const data = await res.json();
    return data;
}

function renderDebateHistory(history) {
    const container = document.getElementById('debateHistory');
    container.innerHTML = '';

    history.forEach(round => {
        const roundDiv = document.createElement('div');
        roundDiv.innerHTML = `<h5>Round ${round.round}</h5>`;
        round.results.forEach(arg => {
            const agentDiv = document.createElement('div');
            agentDiv.innerHTML = `
                <strong>${arg.agent}</strong> — Position: ${arg.position}<br/>
                <ul>
                    ${arg.reasoning.map(step => `<li>${step}</li>`).join('')}
                </ul>
            `;
            roundDiv.appendChild(agentDiv);
        });
        container.appendChild(roundDiv);
    });
}
