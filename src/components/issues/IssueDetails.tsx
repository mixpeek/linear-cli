import { Box, Text, useInput } from 'ink';
import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { Issue } from '@linear/sdk';
import EditIssue from './EditIssue.js';
import { table } from 'table';
import Link from 'ink-link';
import {
  getStatusName,
  getUserName,
  getTeamName,
  getProjectName,
} from '@/utils/linear-helpers.js';
import {
  getStatusEmoji,
  getPriorityEmoji,
} from '@/utils/emoji-helpers.js';

// Configure marked to use terminal renderer
marked.use(markedTerminal());


export interface IssueDetailsProps {
  issue: Issue;
  onBack: () => void;
  onEdit: (issue: Issue) => void;
  onUpdate?: (issue: Issue) => void;
}

export const IssueDetails: React.FC<IssueDetailsProps> = ({ 
  issue, 
  onBack,
  onEdit,
  onUpdate 
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [resolvedNames, setResolvedNames] = useState({
    status: '',
    assignee: '',
    team: '',
    project: ''
  });

  // Resolve names when component mounts or issue changes
  useEffect(() => {
    const resolveNames = async () => {
      const [status, assignee, team, project] = await Promise.all([
        getStatusName(issue.state),
        getUserName(issue.assignee),
        getTeamName(issue.team),
        getProjectName(issue.project)
      ]);

      setResolvedNames({
        status,
        assignee,
        team,
        project
      });
    };

    resolveNames();
  }, [issue]);


  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      onBack();
      return;
    }

    if (input === 'e' && !isEditMode) {
      onEdit(issue);
      return;
    }
  });

  if (isEditMode) {
    return (
      <EditIssue
        issue={issue}
        onBack={() => setIsEditMode(false)}
        onUpdate={(updatedIssue) => {
          if (onUpdate) {
            onUpdate(updatedIssue);
          }
          setIsEditMode(false);
        }}
      />
    );
  }

  const tableData = [
    ['Field', 'Value'],
    ['Identifier', issue.identifier],
    ['Title', issue.title],
    ['Status', getStatusEmoji(resolvedNames.status) + ' ' + resolvedNames.status],
    ['Priority', getPriorityEmoji(issue.priority) + ' ' + issue.priority],
    ['Created', new Date(issue.createdAt).toLocaleString()],
    ['Assignee', resolvedNames.assignee],
    ['Team', resolvedNames.team],
    ['Project', resolvedNames.project],
    ...(issue.completedAt ? [['Completed', new Date(issue.completedAt).toLocaleString()]] : [])
  ];

  const config = {
    border: {
      topBody: '─',
      topJoin: '┬',
      topLeft: '┌',
      topRight: '┐',
      bottomBody: '─',
      bottomJoin: '┴',
      bottomLeft: '└',
      bottomRight: '┘',
      bodyLeft: '│',
      bodyRight: '│',
      bodyJoin: '│',
      joinBody: '─',
      joinLeft: '├',
      joinRight: '┤',
      joinJoin: '┼',
    },
    columns: [
      { alignment: 'left' as const, width: 14 },  // Field
      { alignment: 'left' as const, width: 52 }   // Value
    ],
    drawHorizontalLine: (index: number, size: number) => {
      return index === 0 || index === 1 || index === size || index > 1;
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>Press &apos;e&apos; to edit, &apos;q&apos; or &apos;Esc&apos; to go back</Text>
      </Box>

      <Box marginBottom={1}>
        <Text bold>Viewing Issue: {issue.identifier}</Text>
      </Box>

      <Box>
        <Text bold inverse color="green">Issue Details</Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text>{table(tableData, config)}</Text>
      </Box>

      {issue.url && (
        <Box marginBottom={1} flexDirection="column" borderStyle="single" borderColor="blue">
          <Text bold inverse color="blue">URL:</Text>
          <Link url={issue.url}>{issue.url}</Link>
        </Box>
      )}

      <Box marginBottom={1} flexDirection="column" borderStyle="single" borderColor="yellow">
        <Text bold inverse color="yellow">Description:</Text>
        <Text>{ issue.description ? marked.parse(issue.description) : '--No description--'}</Text>
      </Box>
    </Box>
  );
}; 