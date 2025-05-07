import { Command } from 'commander';
import { getLinearClient } from '../../config/linear.js';
import { render } from 'ink';
import React, { useState } from 'react';
import { Issue } from '@linear/sdk';
import { IssueDetails } from '@/components/issues/IssueDetails.js';
import EditIssue from '@/components/issues/EditIssue.js';

type ViewMode = 'details' | 'edit';

const ViewIssueCommand = new Command('view')
  .description('View a specific issue by its label (e.g., ABC-123)')
  .argument('<label>', 'Issue label (e.g., ABC-123)')
  .action(async (label: string) => {
    try {
      const client = getLinearClient();
      if (!label){
        console.error(`No label given.`);
        process.exit(1);
      }
      const issue = await client.issue(label);
      const state = await issue.state;
      const assignee = await issue.assignee;
      const project = await issue.project;
      const team = await issue.team;

      const issueWithData = {
        ...issue,
        state,
        assignee,
        project,
        team,
      } as Issue;

      const ViewIssue = () => {
        const [viewMode, setViewMode] = useState<ViewMode>('details');
        const [currentIssue, setCurrentIssue] = useState<Issue>(issueWithData);

        const handleIssueUpdate = (updatedIssue: Issue) => {
          setCurrentIssue(updatedIssue);
        };

        return viewMode === 'edit' ? (
          <EditIssue
            issue={currentIssue}
            onBack={() => setViewMode('details')}
            onUpdate={handleIssueUpdate}
          />
        ) : (
          <IssueDetails 
            issue={currentIssue} 
            onBack={() => process.exit(0)}
            onEdit={() => setViewMode('edit')}
            onUpdate={handleIssueUpdate}
          />
        );
      };

      render(<ViewIssue />);
    } catch (error) {
      console.error('Error fetching issue:');
      if (error instanceof Error) {
        console.error(error.message);
      }
      process.exit(1);
    }
  });

export default ViewIssueCommand; 