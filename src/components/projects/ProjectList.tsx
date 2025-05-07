import React, { useEffect, useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import { table } from 'table';
import { Project } from '@linear/sdk';

interface ProjectListProps {
  projects: Project[];
  activeProjectId?: string;
  onSortedProjects: (projects: Project[]) => void;
}

interface ResolvedNames {
  [key: string]: {
    lead: string;
    team: string;
  };
}

// State order for sorting (higher index = lower priority)
const STATE_ORDER: { [key: string]: number } = {
  'planned': 0,
  'in_progress': 1,
  'paused': 2,
  'completed': 3,
  'canceled': 3  // Treat canceled same as completed
};

const getStateOrder = (state: string): number => 
  STATE_ORDER[state] ?? 1; // Default to in_progress priority if unknown

const sortProjects = (projects: Project[], resolvedNames: ResolvedNames): Project[] => {
  return [...projects].sort((a, b) => {
    const aState = a.state || '';
    const bState = b.state || '';
    
    // First compare state categories
    const stateDiff = getStateOrder(aState) - getStateOrder(bState);
    if (stateDiff !== 0) return stateDiff;

    // Within same state, sort by start date
    if (a.startedAt && b.startedAt) {
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    }

    // If one has start date and other doesn't, prioritize the one with start date
    if (a.startedAt) return -1;
    if (b.startedAt) return 1;

    // If no start dates, sort by creation date
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

const formatDate = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return 'Not set';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
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

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  activeProjectId,
  onSortedProjects
}) => {
  const [resolvedNames, setResolvedNames] = useState<ResolvedNames>({});
  const [isLoading, setIsLoading] = useState(true);

  // Resolve names when component mounts or projects change
  useEffect(() => {
    const resolveNames = async () => {
      setIsLoading(true);
      const newResolvedNames: ResolvedNames = {};

      await Promise.all(projects.map(async (project) => {
        // Teams and lead are already properties of the project object
        const teams = project.teams as unknown as { nodes: Array<{ name: string }> };
        const lead = project.lead as unknown as { name: string };

        newResolvedNames[project.id] = {
          lead: lead?.name || 'Unassigned',
          team: teams?.nodes?.[0]?.name || 'No Team'
        };
      }));

      setResolvedNames(newResolvedNames);
      setIsLoading(false);
    };

    resolveNames();
  }, [projects]);

  // Memoize sorted projects to prevent unnecessary re-sorting
  const sortedProjects = useMemo(() => {
    return sortProjects(projects, resolvedNames);
  }, [projects, resolvedNames]);

  // Notify parent of sorted order in an effect
  useEffect(() => {
    onSortedProjects(sortedProjects);
  }, [sortedProjects, onSortedProjects]);

  if (isLoading) {
    return (
      <Box>
        <Text>Loading projects...</Text>
      </Box>
    );
  }

  const tableData = [
    ['>', 'ID', 'Name', 'State', 'Lead', 'Team', 'Start Date', 'Target Date'],
    ...sortedProjects.map((project) => {
      const isSelected = project.id === activeProjectId;
      const cursor = isSelected ? '▶' : ' ';
      const names = resolvedNames[project.id] || {
        lead: 'Unassigned',
        team: 'No Team'
      };
      
      return [
        cursor,
        truncateText(project.id, 10),
        truncateText(project.name, 45),
        truncateText(project.state || 'Unknown', 12),
        truncateText(names.lead, 15),
        truncateText(names.team, 15),
        truncateText(formatDate(project.startedAt), 12),
        truncateText(formatDate(project.targetDate), 12)
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
      { alignment: 'left' as const, width: 47 },  // Name
      { alignment: 'left' as const, width: 12 },  // State
      { alignment: 'left' as const, width: 17 },  // Lead
      { alignment: 'left' as const, width: 17 },  // Team
      { alignment: 'left' as const, width: 12 },  // Start Date
      { alignment: 'left' as const, width: 12 }   // Target Date
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

export default ProjectList;