import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, Key, useApp } from 'ink';
import { Project, LinearClient } from '@linear/sdk';
import { table } from 'table';
import { openEditor } from '@/utils/editor.js';
import { getLinearClient } from '@/config/linear.js';

interface EditProjectProps {
  project: Project;
  onBack: () => void;
  onUpdate: (updatedProject: Project) => void;
}

interface ProjectFormState {
  name: string;
  description: string;
  state: string;
  lead: string;
  team: string;
  startDate: string;
  targetDate: string;
}

interface SelectionOptions {
  users: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  states: { id: string; name: string }[];
}

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

const EditProject: React.FC<EditProjectProps> = ({ project, onBack, onUpdate }) => {
  const { exit } = useApp();
  const [activeField, setActiveField] = useState<keyof ProjectFormState>('name');
  const [formState, setFormState] = useState<ProjectFormState>({
    name: project.name,
    description: project.description || '',
    state: '',
    lead: '',
    team: '',
    startDate: project.startedAt ? new Date(project.startedAt).toISOString().split('T')[0] : '',
    targetDate: project.targetDate ? new Date(project.targetDate).toISOString().split('T')[0] : ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [options, setOptions] = useState<SelectionOptions>({
    users: [],
    teams: [],
    states: []
  });

  // Column widths configuration
  const COLUMN_WIDTHS = {
    cursor: 1,
    field: 14,
    value: 52,
    help: 20
  };

  // Load all options when component mounts
  useEffect(() => {
    const loadOptions = async () => {
      const client = getLinearClient();
      
      // Load users
      const users = await client.users();
      const userOptions = users.nodes.map(user => ({
        id: user.id,
        name: user.name
      }));

      // Load teams
      const teams = await client.teams();
      const teamOptions = teams.nodes.map(team => ({
        id: team.id,
        name: team.name
      }));

      // Load states
      const states = await client.workflowStates();
      const stateOptions = states.nodes.map(state => ({
        id: state.id,
        name: state.name
      }));

      setOptions({
        users: userOptions,
        teams: teamOptions,
        states: stateOptions
      });
    };

    loadOptions();
  }, [project]);

  // Resolve names when component mounts or project changes
  useEffect(() => {
    const resolveNames = async () => {
      const client = getLinearClient();
      
      // Fetch project data with all relations
      const projectWithData = await client.project(project.id);
      
      // Get the lead and teams
      const lead = await projectWithData.lead;
      const teams = await projectWithData.teams({ first: 1 });

      setFormState(prev => ({ 
        ...prev, 
        state: project.state || '',
        lead: lead?.name || '',
        team: teams.nodes[0]?.name || ''
      }));
    };

    resolveNames();
  }, [project]);

  // Field definitions with help text
  const fields: Array<{
    key: keyof ProjectFormState;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'date';
    help: string;
    options?: string[] | number[];
    selectionOptions?: { id: string; name: string }[];
  }> = [
    { key: 'name', label: 'Name', type: 'text', help: 'Enter to edit' },
    { key: 'description', label: 'Description', type: 'textarea', help: 'Enter to edit' },
    { key: 'state', label: 'State', type: 'select', help: '← → to change', selectionOptions: options.states },
    { key: 'lead', label: 'Lead', type: 'select', help: '← → to change', selectionOptions: options.users },
    { key: 'team', label: 'Team', type: 'select', help: '← → to change', selectionOptions: options.teams },
    { key: 'startDate', label: 'Start Date', type: 'date', help: 'Enter to edit (YYYY-MM-DD)' },
    { key: 'targetDate', label: 'Target Date', type: 'date', help: 'Enter to edit (YYYY-MM-DD)' }
  ];

  // Field editing handler
  const handleFieldEdit = (field: typeof fields[0]) => {
    if (!isEditing && (field.type === 'text' || field.type === 'textarea')) {
      try {
        setIsEditing(true);
        
        // Get current content
        const currentContent = formState[field.key] as string;
        
        // Launch editor synchronously - this will block until editor exits
        const newContent = openEditor(
          currentContent, 
          field.key === 'description' ? 'md' : 'txt'
        );
        
        // Update form state with new content
        setFormState(prev => ({ 
          ...prev, 
          [field.key]: newContent 
        }));
      } catch (error) {
        console.error('Editor error:', error);
      } finally {
        setIsEditing(false);
      }
    }
  };

  // Handle selection change
  const handleSelectionChange = (
    field: typeof fields[0], 
    direction: 'left' | 'right'
  ) => {
    if (field.selectionOptions) {
      const currentName = formState[field.key];
      const currentIndex = field.selectionOptions.findIndex(opt => opt.name === currentName);
      
      if (direction === 'left' && currentIndex > 0) {
        setFormState(prev => ({ 
          ...prev, 
          [field.key]: field.selectionOptions![currentIndex - 1].name 
        }));
      }

      if (direction === 'right' && currentIndex < field.selectionOptions.length - 1) {
        setFormState(prev => ({ 
          ...prev, 
          [field.key]: field.selectionOptions![currentIndex + 1].name 
        }));
      }
    }
  };

  // Keyboard navigation
  useInput((input: string, key: Key) => {
    // Ignore input while editing
    if (isEditing) return;

    if (input === 'q' || key.escape) {
      onBack();
      return;
    }

    // Submit
    if (input === 's') {
      const client = getLinearClient();
      setIsSaving(true);
      setSaveMessage(null);
      
      // Update the project using the Linear client
      client.updateProject(project.id, {
        name: formState.name,
        description: formState.description,
        state: formState.state,
        leadId: options.users.find(u => u.name === formState.lead)?.id,
        teamIds: [options.teams.find(t => t.name === formState.team)?.id].filter(Boolean) as string[],
        startDate: formState.startDate ? new Date(formState.startDate) : null,
        targetDate: formState.targetDate ? new Date(formState.targetDate) : null
      }).then(async result => {
        if (result.success && result.project) {
          // Wait for the project to resolve since it's a LinearFetch type
          const updatedProject = await result.project;
          onUpdate(updatedProject);
          setSaveMessage({ 
            text: `Project ${updatedProject.name} saved at ${new Date().toLocaleTimeString()}`,
            type: 'success' 
          });
        } else {
          setSaveMessage({ text: 'Failed to save project', type: 'error' });
        }
      }).catch(error => {
        setSaveMessage({ text: `Error: ${error.message}`, type: 'error' });
      }).finally(() => {
        setIsSaving(false);
      });
      return;
    }

    // Field navigation
    if (key.upArrow) {
      const currentIndex = fields.findIndex(f => f.key === activeField);
      if (currentIndex > 0) {
        setActiveField(fields[currentIndex - 1].key);
        setSaveMessage(null); // Clear save message when navigating
      }
      return;
    }

    if (key.downArrow) {
      const currentIndex = fields.findIndex(f => f.key === activeField);
      if (currentIndex < fields.length - 1) {
        setActiveField(fields[currentIndex + 1].key);
        setSaveMessage(null); // Clear save message when navigating
      }
      return;
    }

    // Field editing
    const field = fields.find(f => f.key === activeField);
    if (!field) return;

    if (field.type === 'select') {
      if (key.leftArrow) {
        handleSelectionChange(field, 'left');
      } else if (key.rightArrow) {
        handleSelectionChange(field, 'right');
      }
    } else if (key.return) {
      handleFieldEdit(field);
    }
  });

  const tableData = [
    ['>', 'Field', 'Value', 'Help'],
    ...fields.map(field => {
      const isActive = field.key === activeField;
      const value = formState[field.key];

      return [
        isActive ? '▶' : ' ',
        formatTableCell(field.label, COLUMN_WIDTHS.field),
        formatTableCell(value, COLUMN_WIDTHS.value),
        formatTableCell(isActive ? field.help : '', COLUMN_WIDTHS.help)
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
      { alignment: 'left' as const, width: COLUMN_WIDTHS.cursor },
      { alignment: 'left' as const, width: COLUMN_WIDTHS.field },
      { alignment: 'left' as const, width: COLUMN_WIDTHS.value },
      { alignment: 'left' as const, width: COLUMN_WIDTHS.help }
    ],
    drawHorizontalLine: (index: number, size: number) => {
      // Draw lines between all rows
      return true;
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>Editing Project: {project.name}</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text>Press &apos;s&apos; to save, &apos;q&apos; or &apos;ESC&apos; to cancel, ↑↓ to navigate</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>{table(tableData, config)}</Text>
      </Box>

      {isEditing && (
        <Box>
          <Text color="yellow">Opening editor... (save and quit to continue)</Text>
        </Box>
      )}

      {isSaving && (
        <Box>
          <Text color="blue">
            Saving project {project.name}...
          </Text>
        </Box>
      )}

      {saveMessage && !isSaving && (
        <Box>
          <Text color={saveMessage.type === 'success' ? 'green' : 'red'}>
            {saveMessage.text}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default EditProject; 