import React, { useEffect, useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import { table } from 'table';
import { Issue } from '@linear/sdk';
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

interface IssueListProps {
  issues: Issue[];
  activeIssueId: string | null;
  onSortedIssues?: (sortedIssues: Issue[]) => void;
}

interface ResolvedNames {
  [key: string]: {
    status: string;
    assignee: string;
    team: string;
    project: string;
  };
}

// Status order for sorting (higher index = lower priority)
const STATUS_ORDER: { [key: string]: number } = {
  'In Progress': 0,
  'Backlog': 1,
  'Todo': 1,  // Treat Todo same as Backlog
  'Done': 2,
  'Canceled': 2  // Treat Canceled same as Done
};

const getStatusOrder = (status: string): number => 
  STATUS_ORDER[status] ?? 1; // Default to Backlog priority if unknown

const sortIssues = (issues: Issue[], resolvedNames: ResolvedNames): Issue[] => {
  return [...issues].sort((a, b) => {
    const aStatus = resolvedNames[a.id]?.status || '';
    const bStatus = resolvedNames[b.id]?.status || '';
    
    // First compare status categories
    const statusDiff = getStatusOrder(aStatus) - getStatusOrder(bStatus);
    if (statusDiff !== 0) return statusDiff;

    // Within same status, sort by priority (higher number = higher priority)
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    // For done items, sort by completion date descending
    if (getStatusOrder(aStatus) === STATUS_ORDER['Done']) {
      return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
    }

    // For non-done items, sort by creation date descending
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });
};

const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
};

export const IssueList: React.FC<IssueListProps> = ({ issues, activeIssueId, onSortedIssues }) => {
  const [resolvedNames, setResolvedNames] = useState<ResolvedNames>({});
  const [isLoading, setIsLoading] = useState(true);

  // Resolve names when component mounts or issues change
  useEffect(() => {
    const resolveNames = async () => {
      setIsLoading(true);
      const newResolvedNames: ResolvedNames = {};

      await Promise.all(issues.map(async (issue) => {
        const [status, assignee, team, project] = await Promise.all([
          getStatusName(issue.state),
          getUserName(issue.assignee),
          getTeamName(issue.team),
          getProjectName(issue.project)
        ]);

        newResolvedNames[issue.id] = {
          status,
          assignee,
          team,
          project
        };
      }));

      setResolvedNames(newResolvedNames);
      setIsLoading(false);
    };

    resolveNames();
  }, [issues]);

  // Memoize sorted issues to prevent unnecessary re-sorting
  const sortedIssues = useMemo(() => {
    return sortIssues(issues, resolvedNames);
  }, [issues, resolvedNames]);

  // Notify parent of sorted order in an effect
  useEffect(() => {
    onSortedIssues?.(sortedIssues);
  }, [sortedIssues, onSortedIssues]);

  if (isLoading) {
    return (
      <Box>
        <Text>Loading issues...</Text>
      </Box>
    );
  }

  const tableData = [
    ['>', 'ID', 'Title', 'Status', 'Priority', 'Assignee', 'Team', 'Project', 'Created'],
    ...sortedIssues.map((issue) => {
      const isSelected = issue.identifier === activeIssueId;
      const cursor = isSelected ? '▶' : ' ';
      const names = resolvedNames[issue.id] || {
        status: '',
        assignee: 'Unassigned',
        team: 'No Team',
        project: 'No Project'
      };
      
      return [
        cursor,
        truncateText(issue.identifier, 10),
        truncateText(issue.title, 45),
        truncateText(getStatusEmoji(names.status) + ' ' + names.status, 10),
        truncateText(getPriorityEmoji(issue.priority) + ' ' + issue.priority, 10),
        truncateText(names.assignee, 15),
        truncateText(names.team, 15),
        truncateText(names.project, 15),
        truncateText(formatDate(issue.createdAt.toString()), 8)
      ];
    })
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
      joinJoin: '┼'
    },
    columns: [
      { alignment: 'left' as const, width: 1 },   // Cursor
      { alignment: 'left' as const, width: 12 },  // ID
      { alignment: 'left' as const, width: 47 },  // Title
      { alignment: 'left' as const, width: 12 },  // Status
      { alignment: 'left' as const, width: 12 },  // Priority
      { alignment: 'left' as const, width: 17 },  // Assignee
      { alignment: 'left' as const, width: 17 },  // Team
      { alignment: 'left' as const, width: 17 },  // Project
      { alignment: 'left' as const, width: 9 }   // Date
    ]
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>Use ↑↓ to navigate, Enter to view details, &apos;e&apos; to edit, &apos;q&apos; to quit</Text>
      </Box>

      <Box>
        <Text>{table(tableData, config)}</Text>
      </Box>
    </Box>
  );
}; 