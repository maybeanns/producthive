/**
 * Jira API Client for automated task management
 */

export interface JiraConfig {
    host: string;
    email: string;
    apiToken: string;
    projectKey: string;
}

export interface JiraIssue {
    key?: string;
    summary: string;
    description: string;
    issuetype: { name: string };
    priority?: { name: string };
}

export class JiraClient {
    public host: string;
    private auth: string;
    public projectKey: string;

    constructor(config: JiraConfig) {
        this.host = config.host.replace(/\/$/, '');
        this.auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
        this.projectKey = config.projectKey;
    }

    private async request(path: string, options: RequestInit = {}) {
        const url = `${this.host}/rest/api/3${path}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Basic ${this.auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Jira API Error: ${response.status} - ${error}`);
        }

        return response.json();
    }

    /**
     * Create a Jira project (if it doesn't exist)
     * In a real scenario, we'd usually use an existing one
     */
    async getProject() {
        return this.request(`/project/${this.projectKey}`);
    }

    /**
     * Create an issue in Jira
     */
    async createIssue(issue: Partial<JiraIssue>) {
        const body = {
            fields: {
                project: { key: this.projectKey },
                summary: issue.summary,
                description: {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [{ type: 'text', text: issue.description || '' }]
                        }
                    ]
                },
                issuetype: { name: issue.issuetype?.name || 'Task' },
                ...(issue.priority && { priority: { name: issue.priority.name } })
            }
        };

        return this.request('/issue', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    /**
     * Bulk create issues (useful for task breakdowns)
     */
    async createIssues(issues: Partial<JiraIssue>[]) {
        const results = [];
        for (const issue of issues) {
            results.push(await this.createIssue(issue));
        }
        return results;
    }
}

/**
 * Get Jira client from environment or user session
 */
export function getJiraClient(config?: Partial<JiraConfig>): JiraClient {
    const host = config?.host || process.env.JIRA_HOST;
    const email = config?.email || process.env.JIRA_EMAIL;
    const apiToken = config?.apiToken || process.env.JIRA_API_TOKEN;
    const projectKey = config?.projectKey || process.env.JIRA_PROJECT_KEY;

    if (!host || !email || !apiToken || !projectKey) {
        throw new Error('Jira configuration missing. Host, Email, API Token, and Project Key are required.');
    }

    return new JiraClient({ host, email, apiToken, projectKey });
}
