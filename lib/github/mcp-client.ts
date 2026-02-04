/**
 * GitHub MCP Client for automated Git workflows
 */

import { Octokit } from '@octokit/rest';
import type { CommitInfo } from '@/lib/types/agent-types';

export interface GitHubClientConfig {
    token: string;
    owner: string;
    repo: string;
}

export class GitHubClient {
    private octokit: Octokit;
    private owner: string;
    private repo: string;

    constructor(config: GitHubClientConfig) {
        this.octokit = new Octokit({
            auth: config.token,
        });
        this.owner = config.owner;
        this.repo = config.repo;
    }

    /**
     * Initialize a new repository
     */
    async createRepository(repoName: string, isPrivate: boolean = false): Promise<string> {
        try {
            const { data } = await this.octokit.repos.createForAuthenticatedUser({
                name: repoName,
                private: isPrivate,
                auto_init: true,
            });

            this.repo = data.name;
            return data.html_url;
        } catch (error) {
            console.error('Error creating repository:', error);
            throw new Error(`Failed to create repository: ${error}`);
        }
    }

    /**
     * Create a new branch
     */
    async createBranch(branchName: string, fromBranch: string = 'main'): Promise<void> {
        try {
            // Get the SHA of the branch to branch from
            const { data: ref } = await this.octokit.git.getRef({
                owner: this.owner,
                repo: this.repo,
                ref: `heads/${fromBranch}`,
            });

            // Create new branch
            await this.octokit.git.createRef({
                owner: this.owner,
                repo: this.repo,
                ref: `refs/heads/${branchName}`,
                sha: ref.object.sha,
            });
        } catch (error) {
            console.error('Error creating branch:', error);
            throw new Error(`Failed to create branch: ${error}`);
        }
    }

    /**
     * Commit files to a branch
     */
    async commitFiles(
        files: { path: string; content: string }[],
        message: string,
        branch: string = 'main'
    ): Promise<CommitInfo> {
        try {
            // Get current commit SHA
            const { data: refData } = await this.octokit.git.getRef({
                owner: this.owner,
                repo: this.repo,
                ref: `heads/${branch}`,
            });
            const currentCommitSha = refData.object.sha;

            // Get current tree
            const { data: commitData } = await this.octokit.git.getCommit({
                owner: this.owner,
                repo: this.repo,
                commit_sha: currentCommitSha,
            });
            const currentTreeSha = commitData.tree.sha;

            // Create blobs for each file
            const blobs = await Promise.all(
                files.map(async (file) => {
                    const { data } = await this.octokit.git.createBlob({
                        owner: this.owner,
                        repo: this.repo,
                        content: Buffer.from(file.content).toString('base64'),
                        encoding: 'base64',
                    });
                    return {
                        path: file.path,
                        mode: '100644' as const,
                        type: 'blob' as const,
                        sha: data.sha,
                    };
                })
            );

            // Create new tree
            const { data: newTree } = await this.octokit.git.createTree({
                owner: this.owner,
                repo: this.repo,
                base_tree: currentTreeSha,
                tree: blobs,
            });

            // Create commit
            const { data: newCommit } = await this.octokit.git.createCommit({
                owner: this.owner,
                repo: this.repo,
                message,
                tree: newTree.sha,
                parents: [currentCommitSha],
            });

            // Update reference
            await this.octokit.git.updateRef({
                owner: this.owner,
                repo: this.repo,
                ref: `heads/${branch}`,
                sha: newCommit.sha,
            });

            return {
                message,
                files: files.map(f => f.path),
                author: 'planning', // Default
                timestamp: new Date(),
            };
        } catch (error) {
            console.error('Error committing files:', error);
            throw new Error(`Failed to commit files: ${error}`);
        }
    }

    /**
     * Create a pull request
     */
    async createPullRequest(
        title: string,
        body: string,
        headBranch: string,
        baseBranch: string = 'main'
    ): Promise<string> {
        try {
            const { data } = await this.octokit.pulls.create({
                owner: this.owner,
                repo: this.repo,
                title,
                body,
                head: headBranch,
                base: baseBranch,
            });

            return data.html_url;
        } catch (error) {
            console.error('Error creating pull request:', error);
            throw new Error(`Failed to create pull request: ${error}`);
        }
    }

    /**
     * Create an issue
     */
    async createIssue(title: string, body: string, labels?: string[]): Promise<string> {
        try {
            const { data } = await this.octokit.issues.create({
                owner: this.owner,
                repo: this.repo,
                title,
                body,
                labels,
            });

            return data.html_url;
        } catch (error) {
            console.error('Error creating issue:', error);
            throw new Error(`Failed to create issue: ${error}`);
        }
    }

    /**
     * Get repository info
     */
    async getRepoInfo(): Promise<{
        name: string;
        url: string;
        defaultBranch: string;
    }> {
        try {
            const { data } = await this.octokit.repos.get({
                owner: this.owner,
                repo: this.repo,
            });

            return {
                name: data.name,
                url: data.html_url,
                defaultBranch: data.default_branch,
            };
        } catch (error) {
            console.error('Error getting repo info:', error);
            throw new Error(`Failed to get repository info: ${error}`);
        }
    }
}

/**
 * Get GitHub client instance
 */
export function getGitHubClient(repoName?: string): GitHubClient {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_ORG;

    if (!token || !owner) {
        throw new Error('GitHub configuration missing. Set GITHUB_TOKEN and GITHUB_ORG environment variables.');
    }

    return new GitHubClient({
        token,
        owner,
        repo: repoName || 'untitled-project',
    });
}
