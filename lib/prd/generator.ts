/**
 * PRD Document Generator
 * Exports PRD to DOCX and PDF formats
 */

import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import type { PRDState } from '@/lib/types/agent-types';

export async function generatePRDDocument(prdState: PRDState): Promise<Document> {
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [
                    // Title
                    new Paragraph({
                        text: prdState.projectName || 'Product Requirements Document',
                        heading: HeadingLevel.TITLE,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                    }),

                    // Overview
                    new Paragraph({
                        text: 'Overview',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 200, after: 100 },
                    }),
                    new Paragraph({
                        text: prdState.overview || 'No overview provided.',
                        spacing: { after: 200 },
                    }),

                    // Objectives
                    new Paragraph({
                        text: 'Objectives',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 200, after: 100 },
                    }),
                    ...prdState.objectives.map(
                        (obj) =>
                            new Paragraph({
                                text: `• ${obj}`,
                                spacing: { after: 100 },
                            })
                    ),

                    // User Stories
                    new Paragraph({
                        text: 'User Stories',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 200, after: 100 },
                    }),
                    ...prdState.userStories.map(
                        (story) =>
                            new Paragraph({
                                text: `• ${story}`,
                                spacing: { after: 100 },
                            })
                    ),

                    // Technical Requirements
                    new Paragraph({
                        text: 'Technical Requirements',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 200, after: 100 },
                    }),
                    ...(prdState.technicalRequirements.frontend
                        ? [
                            new Paragraph({
                                text: 'Frontend',
                                heading: HeadingLevel.HEADING_2,
                                spacing: { before: 100, after: 50 },
                            }),
                            new Paragraph({
                                text: prdState.technicalRequirements.frontend,
                                spacing: { after: 100 },
                            }),
                        ]
                        : []),
                    ...(prdState.technicalRequirements.backend
                        ? [
                            new Paragraph({
                                text: 'Backend',
                                heading: HeadingLevel.HEADING_2,
                                spacing: { before: 100, after: 50 },
                            }),
                            new Paragraph({
                                text: prdState.technicalRequirements.backend,
                                spacing: { after: 100 },
                            }),
                        ]
                        : []),
                    ...(prdState.technicalRequirements.database
                        ? [
                            new Paragraph({
                                text: 'Database',
                                heading: HeadingLevel.HEADING_2,
                                spacing: { before: 100, after: 50 },
                            }),
                            new Paragraph({
                                text: prdState.technicalRequirements.database,
                                spacing: { after: 100 },
                            }),
                        ]
                        : []),

                    // Design Considerations
                    ...(prdState.designConsiderations
                        ? [
                            new Paragraph({
                                text: 'Design Considerations',
                                heading: HeadingLevel.HEADING_1,
                                spacing: { before: 200, after: 100 },
                            }),
                            new Paragraph({
                                text: prdState.designConsiderations,
                                spacing: { after: 200 },
                            }),
                        ]
                        : []),

                    // Risks
                    ...(prdState.risks.length > 0
                        ? [
                            new Paragraph({
                                text: 'Risks & Mitigation',
                                heading: HeadingLevel.HEADING_1,
                                spacing: { before: 200, after: 100 },
                            }),
                            ...prdState.risks.map(
                                (risk) =>
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: `${risk.category} (${risk.severity}): `,
                                                bold: true,
                                            }),
                                            new TextRun({
                                                text: `${risk.description}. Mitigation: ${risk.mitigation}`,
                                            }),
                                        ],
                                        spacing: { after: 100 },
                                    })
                            ),
                        ]
                        : []),

                    // Success Metrics
                    ...(prdState.successMetrics.length > 0
                        ? [
                            new Paragraph({
                                text: 'Success Metrics',
                                heading: HeadingLevel.HEADING_1,
                                spacing: { before: 200, after: 100 },
                            }),
                            ...prdState.successMetrics.map(
                                (metric) =>
                                    new Paragraph({
                                        text: `• ${metric}`,
                                        spacing: { after: 100 },
                                    })
                            ),
                        ]
                        : []),
                ],
            },
        ],
    });

    return doc;
}

/**
 * Format PRD as Markdown
 */
export function formatPRDMarkdown(prdState: PRDState): string {
    let markdown = '';

    markdown += `# ${prdState.projectName || 'Product Requirements Document'}\n\n`;

    if (prdState.overview) {
        markdown += `## Overview\n\n${prdState.overview}\n\n`;
    }

    if (prdState.objectives.length > 0) {
        markdown += `## Objectives\n\n`;
        prdState.objectives.forEach((obj) => {
            markdown += `- ${obj}\n`;
        });
        markdown += '\n';
    }

    if (prdState.userStories.length > 0) {
        markdown += `## User Stories\n\n`;
        prdState.userStories.forEach((story) => {
            markdown += `- ${story}\n`;
        });
        markdown += '\n';
    }

    markdown += `## Technical Requirements\n\n`;
    if (prdState.technicalRequirements.frontend) {
        markdown += `### Frontend\n\n${prdState.technicalRequirements.frontend}\n\n`;
    }
    if (prdState.technicalRequirements.backend) {
        markdown += `### Backend\n\n${prdState.technicalRequirements.backend}\n\n`;
    }
    if (prdState.technicalRequirements.database) {
        markdown += `### Database\n\n${prdState.technicalRequirements.database}\n\n`;
    }

    if (prdState.designConsiderations) {
        markdown += `## Design Considerations\n\n${prdState.designConsiderations}\n\n`;
    }

    if (prdState.risks.length > 0) {
        markdown += `## Risks & Mitigation\n\n`;
        prdState.risks.forEach((risk) => {
            markdown += `- **${risk.category}** (${risk.severity}): ${risk.description}. *Mitigation: ${risk.mitigation}*\n`;
        });
        markdown += '\n';
    }

    if (prdState.successMetrics.length > 0) {
        markdown += `## Success Metrics\n\n`;
        prdState.successMetrics.forEach((metric) => {
            markdown += `- ${metric}\n`;
        });
        markdown += '\n';
    }

    return markdown;
}
