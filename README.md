# ProductHive 🐝

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![AI Powered](https://img.shields.io/badge/AI-Powered-green)

**Where ideas become reality** - Professional multi-agent software creation platform with PRD generation and GitHub automation.

![ProductHive Landing](https://github.com/user-attachments/assets/12c15a78-6813-4571-8653-d4e6dc925ab9)

## 🌟 Features

### Multi-Agent System
ProductHive uses a unified team of AI agents that work together throughout the entire product lifecycle:

- **Planning Agent** - Strategic planning and task breakdown
- **UX Agent** - User experience design and UI implementation
- **Backend Agent** - Server-side architecture and APIs  
- **Frontend Agent** - Client-side development and React components
- **Database Agent** - Data modeling and database optimization
- **Business Agent** - Business analysis and requirements validation
- **Testing Agent** - Quality assurance and automated testing
- **Deployment Agent** - Infrastructure and CI/CD setup

### Key Capabilities

✨ **PRD Generation** - Collaborative debate between expert agents creates comprehensive Product Requirement Documents

🚀 **Automated Development** - The same agents that created the PRD build the software, ensuring perfect alignment

🧪 **Intelligent Testing** - Testing agent validates implementations against PRD requirements

📦 **GitHub Automation** - Automated Git workflows with commits, branches, and pull requests

☁️ **Smart Deployment** - Deployment agent handles infrastructure and production setup

## 🏗️ Architecture

The platform follows a **unified agent architecture** where agents participate in BOTH PRD generation AND software development phases. This ensures:

- Complete product knowledge continuity from planning to implementation
- Faster development with context-aware code generation
- Alignment between requirements and implementation
- Efficient collaboration between specialized agents

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Google Cloud Project with Vertex AI enabled
- GitHub Personal Access Token (for GitHub automation)
- Google Cloud Service Account with Vertex AI permissions

### Installation

```bash
# Clone the repository
git clone https://github.com/maybeanns/producthive.git
cd producthive

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Environment Variables

```bash
# Google Cloud AI Platform
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-1.5-pro
GOOGLE_APPLICATION_CREDENTIALS=./path-to-service-account.json

# GitHub Integration
GITHUB_TOKEN=your-github-token
GITHUB_ORG=your-github-username

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Build for Production

```bash
npm run build
npm start
```

## 📖 Usage

### 1. Create a Project

Enter your project idea on the landing page:
```
Build me an e-commerce platform with user authentication, 
product catalog, shopping cart, and payment integration.
```

### 2. PRD Generation

The multi-agent system debates and creates a comprehensive PRD:
- Planning Agent breaks down requirements
- UX Agent defines user flows
- Backend Agent proposes API architecture
- Frontend Agent suggests UI components
- Database Agent designs data models
- Business Agent validates business value

### 3. Software Development

The same agents transition to development:
- **Planning Phase**: Task breakdown and sprint planning
- **Implementation Phase**: Code generation for all components
- **Testing Phase**: Automated testing and bug detection
- **Deployment Phase**: Infrastructure setup and deployment

### 4. GitHub Integration

Automated Git workflow:
- Repository initialization
- Feature branch creation
- Automated commits during development
- Pull request generation with descriptions
- Issue tracking for bugs and features

## 🛠️ API Routes

### PRD Generation

```typescript
// Start PRD debate
POST /api/prd/start
Body: { topic: string }

// Continue PRD debate
POST /api/prd/continue
Body: { sessionId: string, userMessage?: string }

// Get PRD state
GET /api/prd/state?sessionId=xxx
```

### Development

```typescript
// Plan development
POST /api/development/plan
Body: { sessionId: string, prdState: PRDState }

// Generate code
POST /api/development/generate
Body: { sessionId: string, filePath: string, description: string }

// Run tests
POST /api/development/test
Body: { sessionId: string }
```

### GitHub

```typescript
// Initialize repository
POST /api/github/init
Body: { repoName: string, isPrivate: boolean }

// Commit files
POST /api/github/commit
Body: { files: CodeFile[], message: string, branch: string }

// Create pull request
POST /api/github/pr
Body: { title: string, body: string, headBranch: string }
```

## 🎨 Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with glassmorphism effects
- **AI**: Google Vertex AI (Gemini 1.5 Pro)
- **Animations**: Framer Motion
- **GitHub**: Octokit (GitHub REST API)
- **Document Generation**: docx, jspdf

## 📁 Project Structure

```
producthive/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   ├── prd/             # PRD generation endpoints
│   │   ├── development/     # Development endpoints
│   │   └── github/          # GitHub automation endpoints
│   ├── page.tsx             # Landing page
│   └── layout.tsx           # Root layout
├── components/              # React components
│   └── landing/             # Landing page components
├── lib/                     # Core library code
│   ├── agents/              # Agent configurations
│   ├── ai/                  # AI client (Vertex AI)
│   ├── prd/                 # PRD orchestrator
│   ├── development/         # Development orchestrator
│   ├── github/              # GitHub MCP client
│   └── types/               # TypeScript types
├── legacy/                  # Original Python implementation
└── public/                  # Static assets
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Google Vertex AI for powerful AI capabilities
- Next.js team for the excellent framework
- All contributors and supporters

## 📞 Support

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ using ProductHive's own multi-agent system**
