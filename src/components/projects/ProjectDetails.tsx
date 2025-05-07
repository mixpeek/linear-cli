import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, Key } from 'ink';
import { Project, LinearClient } from '@linear/sdk';
import { table } from 'table';
import { getLinearClient } from '@/config/linear.js';
import EditProject from '@/components/projects/EditProject.js';

interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
  onEdit?: () => void;
  onUpdate?: (updatedProject: Project) => void;
}

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, onBack, onEdit, onUpdate }) => {
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
  const [currentProject, setCurrentProject] = useState<Project>(project);
  const [projectData, setProjectData] = useState<{
    leadName: string;
    teamName: string;
    startDate: string;
    targetDate: string;
    description: string;
  }>({
    leadName: 'N/A',
    teamName: 'N/A',
    startDate: 'N/A',
    targetDate: 'N/A',
    description: 'N/A'
  });

  // Load all project data upfront
  useEffect(() => {
    const loadProjectData = async () => {
      const client = getLinearClient();
      
      // Fetch project data with all relations
      const projectWithData = await client.project(currentProject.id);
      
      // Fetch all async data in parallel
      const [lead, teams] = await Promise.all([
        projectWithData.lead,
        projectWithData.teams({ first: 1 })
      ]);

      setProjectData({
        leadName: lead?.name || 'N/A',
        teamName: teams.nodes[0]?.name || 'N/A',
        startDate: currentProject.startedAt ? new Date(currentProject.startedAt).toLocaleDateString() : 'N/A',
        targetDate: currentProject.targetDate ? new Date(currentProject.targetDate).toLocaleDateString() : 'N/A',
        description: currentProject.description || 'N/A'
      });
    };

    loadProjectData();
  }, [currentProject]);

  // Handle project update
  const handleProjectUpdate = (updatedProject: Project) => {
    setCurrentProject(updatedProject);
    onUpdate?.(updatedProject);
  };

  // Keyboard navigation
  useInput((input: string, key: Key) => {
    if (input === 'q' || key.escape) {
      onBack();
      return;
    }

    if (input === 'e') {
      if (onEdit) {
        onEdit();
      } else {
        setViewMode('edit');
      }
      return;
    }
  });

  if (viewMode === 'edit') {
    return (
      <EditProject
        project={currentProject}
        onBack={() => setViewMode('view')}
        onUpdate={handleProjectUpdate}
      />
    );
  }

  // Column widths configuration
  const COLUMN_WIDTHS = {
    field: 14,
    value: 52
  };

  // Helper function to truncate text to fit column width
  const truncateText = (text: string, maxWidth: number): string => {
    if (text.length <= maxWidth) return text;
    return text.slice(0, maxWidth - 3) + '...';
  };

  // Helper function to safely format table cell content
  const formatTableCell = (content: string | number, maxWidth: number): string => {
    const stringContent = String(content);
    return truncateText(stringContent, maxWidth);
  };

  const tableData = [
    ['Field', 'Value'],
    ['ID', formatTableCell(currentProject.id, COLUMN_WIDTHS.value)],
    ['Name', formatTableCell(currentProject.name, COLUMN_WIDTHS.value)],
    ['State', formatTableCell(currentProject.state || 'N/A', COLUMN_WIDTHS.value)],
    ['Lead', formatTableCell(projectData.leadName, COLUMN_WIDTHS.value)],
    ['Team', formatTableCell(projectData.teamName, COLUMN_WIDTHS.value)],
    ['Start Date', formatTableCell(projectData.startDate, COLUMN_WIDTHS.value)],
    ['Target Date', formatTableCell(projectData.targetDate, COLUMN_WIDTHS.value)],
    ['Description', formatTableCell(projectData.description, COLUMN_WIDTHS.value)]
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
      { alignment: 'left' as const, width: COLUMN_WIDTHS.field },
      { alignment: 'left' as const, width: COLUMN_WIDTHS.value }
    ],
    drawHorizontalLine: (index: number, size: number) => {
      // Draw lines between all rows
      return true;
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>Project Details</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text>Press &apos;e&apos; to edit, &apos;q&apos; or &apos;ESC&apos; to go back</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>{table(tableData, config)}</Text>
      </Box>
    </Box>
  );
};

export default ProjectDetails; 