import { Command } from 'commander';
import { getLinearClient } from '@/config/linear.js';
import { render } from 'ink';
import React from 'react';
import { Issue } from '@linear/sdk';
import { IssueNavigator } from '@/components/issues/IssueNavigator.js';

export const ListIssuesCommand = new Command('list')
  .description('List all issues')
  .option('-p, --project <project>', 'Filter by project name')
  .option('-a, --assignee <assignee>', 'Filter by assignee name')
  .option('-s, --status <status>', 'Filter by status')
  .action(async (options) => {
    try {
      const client = getLinearClient();
      const issues = await client.issues({
        filter: {
          ...(options.project && { project: { name: { eq: options.project } } }),
          ...(options.assignee && { assignee: { name: { eq: options.assignee } } }),
          ...(options.status && { state: { name: { eq: options.status } } })
        },
      });

      // Fetch all issue data upfront
      const issuesWithData = await Promise.all(
        issues.nodes.map(async (issue) => {
          const state = await issue.state;
          const assignee = await issue.assignee;
          const team = await issue.team;
          const project = await issue.project;
          return {
            ...issue,
            state,
            assignee,
            team,
            project
          } as Issue;
        })
      );

      render(<IssueNavigator initialIssues={issuesWithData} />);
    } catch (error) {
      console.error('Error fetching issues:');
      if (error instanceof Error) {
        console.error(error.message);
      }
      process.exit(1);
    }
  }); 