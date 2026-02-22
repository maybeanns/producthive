# ProductHive 🐝

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![AI Powered](https://img.shields.io/badge/AI-Powered-green)
![Event Driven](https://img.shields.io/badge/Architecture-Event--Driven-orange)

**Where ideas become reality** - Professional multi-agent software creation platform with real-time PRD debate, automated development, and GitHub integration.

<<<<<<< HEAD
## 🌟 Key Features
=======
![ProductHive Landing](https://github.com/user-attachments/assets/12c15a78-6813-4571-8653-d4e6dc925ab9)
### New Interface
<img width="1341" height="643" alt="image" src="https://github.com/user-attachments/assets/36d5048a-f64e-4cdc-aa7b-a83ed53942ef" />
>>>>>>> 172bb6ece94098955594b321fb7891fb9249e10a

### 🧠 Multi-Agent Debate Engine
ProductHive features a unique **asynchronous debate engine** where expert agents brainstorm and challenge each other to build the perfect PRD.
- **Expert Agents**: Planning, UX, Backend, Frontend, Database, and Business analysts.
- **Real-time Thinking**: Watch agents' "internal monologue" through the Thinking Canvas via SSE.
- **Dynamic Consensus**: Automated synthesis of debate transcripts into structured architectures.
- **Human-in-the-Loop**: join the debate! Ask questions or request revisions mid-process.

### 🎭 Specialized Workspace
- **Thinking Canvas**: A logic-heavy visualization of the agent pipeline, showing active phases, progress, and live debate records.
- **Collaborative Chat**: Persistent interaction with your agent team throughout the project lifecycle.

### 🔌 Resilient Architecture
- **Queue-First Design**: Powered by BullMQ and Redis for robust background task handling.
- **Zero-Config Fallback**: Automatically switches to **In-Memory Execution** if Redis is unavailable, ensuring a seamless local development experience.
- **Custom Model Registry**: Support for Gemini, Llama (Groq), GPT-4o, Claude, and Kimi with branded UI integration.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- API keys for your preferred models (Google Cloud, Groq, OpenAI, or Anthropic)
- Redis / Docker (Optional - app will fallback to memory mode)

### Installation
```bash
git clone https://github.com/maybeanns/producthive.git
cd producthive
npm install
cp .env.example .env
```

### Development
```bash
npm run dev
# App will start at http://localhost:3000
```

## 🛠️ Core API Workflow

### PRD Generation
1. **Start**: `POST /api/prd/start` - Enqueues a new debate job.
2. **Stream**: `GET /api/jobs/[jobId]/stream` - SSE endpoint for real-time event tracking.
3. **Continue**: `POST /api/prd/continue` - Enqueues a continuation job with user feedback.

## 🎨 Technology Stack

- **Framework**: Next.js 15 (App Router), React 19
- **Orchestration**: BullMQ, ioredis, Custom Memory Pub-Sub
- **AI**: Gemini 1.5 Pro, Llama 3.1, GPT-4o, Claude 3.5
- **Animations**: Framer Motion
- **UI**: Tailwind CSS, Lucide Icons, Glassmorphism design system

## 📁 Project Structure

```
producthive/
├── app/                  # App routes (api, workspace, landing)
├── components/           # React components (landing, workspace)
├── lib/                  
│   ├── agents/           # Expert agent personas
│   ├── orchestration/    # Debate & Consensus logic
│   ├── events/           # Event streaming system
│   ├── ai/               # Multi-provider registry
│   └── queue/            # Job queueing (Redis + Fallback)
└── public/               # Branded assets & model icons
```

## 📄 License
MIT License.

---
**Built with ❤️ by the ProductHive Agent Team**
