import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, Key, useStdin, useApp } from 'ink';
import { Issue, LinearClient } from '@linear/sdk';
import { table } from 'table';
import { getStatusName, getUserName, getTeamName, getProjectName } from '@/utils/linear-helpers.js';
import { getStatusEmoji, getPriorityEmoji } from '@/utils/emoji-helpers.js';
import { openEditor } from '@/utils/editor.js';
import { getLinearClient } from '@/config/linear.js';

interface EditIssueProps {
  issue: Issue;
  onBack: () => void;
  onUpdate: (updatedIssue: Issue) => void;
}

interface IssueFormState {
  title: string;
  description: string;
  status: string;
  priority: number;
  assignee: string;
  team: string;
  project: string;
}

interface SelectionOptions {
  users: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  projects: { id: string; name: string }[];
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

const EditIssue: React.FC<EditIssueProps> = ({ issue, onBack, onUpdate }) => {
  const { exit } = useApp();
  const [activeField, setActiveField] = useState<keyof IssueFormState>('title');
  const [formState, setFormState] = useState<IssueFormState>({
    title: issue.title,
    description: issue.description || '',
    status: '',
    priority: issue.priority,
    assignee: '',
    team: '',
    project: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveMessage, setSaveMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [options, setOptions] = useState<SelectionOptions>({
    users: [],
    teams: [],
    projects: [],
    states: [],
  });

  // Column widths configuration
  const COLUMN_WIDTHS = {
    cursor: 1,
    field: 14,
    value: 52,
    help: 30,
  };

  // Load all options when component mounts
  useEffect(() => {
    const loadOptions = async () => {
      const client = getLinearClient();

      // Load users
      const users = await client.users();
      const userOptions = users.nodes.map((user) => ({
        id: user.id,
        name: user.name,
      }));

      // Load teams
      const teams = await client.teams();
      const teamOptions = teams.nodes.map((team) => ({
        id: team.id,
        name: team.name,
      }));

      // Load projects
      const projects = await client.projects();
      const projectOptions = projects.nodes.map((project) => ({
        id: project.id,
        name: project.name,
      }));

      // Load states from current team
      const issueTeam = await issue.team;
      const states = issueTeam ? await issueTeam.states() : { nodes: [] };
      const stateOptions = states.nodes.map((state) => ({
        id: state.id,
        name: state.name,
      }));

      setOptions({
        users: userOptions,
        teams: teamOptions,
        projects: projectOptions,
        states: stateOptions,
      });
    };

    loadOptions();
  }, [issue]);

  // Resolve names when component mounts or issue changes
  useEffect(() => {
    const resolveNames = async () => {
      const [status, assignee, team, project] = await Promise.all([
        getStatusName(issue.state),
        getUserName(issue.assignee),
        getTeamName(issue.team),
        getProjectName(issue.project),
      ]);

      setFormState((prev) => ({
        ...prev,
        status,
        assignee,
        team,
        project,
      }));
    };

    resolveNames();
  }, [issue]);

  // Field definitions with help text
  const fields: Array<{
    key: keyof IssueFormState;
    label: string;
    type: 'text' | 'textarea' | 'select';
    help: string;
    options?: string[] | number[];
    selectionOptions?: { id: string; name: string }[];
  }> = [
    { key: 'title', label: 'Title', type: 'text', help: 'Enter to edit' },
    { key: 'description', label: 'Description', type: 'textarea', help: 'Enter to edit' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      help: '← → to change',
      selectionOptions: options.states,
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      help: '← → to change',
      options: [0, 1, 2, 3, 4],
    },
    {
      key: 'assignee',
      label: 'Assignee',
      type: 'select',
      help: 'Type to search, Enter to select',
      selectionOptions: options.users,
    },
    {
      key: 'team',
      label: 'Team',
      type: 'select',
      help: '← → to change',
      selectionOptions: options.teams,
    },
    {
      key: 'project',
      label: 'Project',
      type: 'select',
      help: '← → to change',
      selectionOptions: options.projects,
    },
  ];

  // Get filtered and sorted users based on search query
  const getFilteredUsers = () => {
    if (!searchQuery) return options.users;
    return options.users
      .filter((user) => user.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // Field editing handler
  const handleFieldEdit = (field: (typeof fields)[0]) => {
    if (!isEditing && (field.type === 'text' || field.type === 'textarea')) {
      try {
        setIsEditing(true);

        // Get current content
        const currentContent = formState[field.key] as string;

        // Launch editor synchronously - this will block until editor exits
        const newContent = openEditor(currentContent, field.key === 'description' ? 'md' : 'txt');

        // Update form state with new content
        setFormState((prev) => ({
          ...prev,
          [field.key]: newContent,
        }));
      } catch (error) {
        console.error('Editor error:', error);
      } finally {
        setIsEditing(false);
      }
    }
  };

  // Handle selection change
  const handleSelectionChange = (field: (typeof fields)[0], direction: 'left' | 'right') => {
    if (field.selectionOptions) {
      // Special handling for assignee field with search
      if (field.key === 'assignee') {
        const filteredUsers = getFilteredUsers();
        const currentName = formState[field.key];
        const currentIndex = filteredUsers.findIndex((opt) => opt.name === currentName);

        if (direction === 'left' && currentIndex > 0) {
          setFormState((prev) => ({
            ...prev,
            [field.key]: filteredUsers[currentIndex - 1].name,
          }));
        }

        if (direction === 'right' && currentIndex < filteredUsers.length - 1) {
          setFormState((prev) => ({
            ...prev,
            [field.key]: filteredUsers[currentIndex + 1].name,
          }));
        }
        return;
      }

      // Handle other selection fields
      const currentName = formState[field.key];
      const currentIndex = field.selectionOptions.findIndex((opt) => opt.name === currentName);

      if (direction === 'left' && currentIndex > 0) {
        setFormState((prev) => ({
          ...prev,
          [field.key]: field.selectionOptions![currentIndex - 1].name,
        }));
      }

      if (direction === 'right' && currentIndex < field.selectionOptions.length - 1) {
        setFormState((prev) => ({
          ...prev,
          [field.key]: field.selectionOptions![currentIndex + 1].name,
        }));
      }
    } else if (field.options) {
      // Handle selection from number options (priority)
      const options = field.options;
      const currentValue = formState[field.key];
      const currentIndex = options.findIndex((opt) => String(opt) === String(currentValue));

      if (direction === 'left' && currentIndex > 0) {
        setFormState((prev) => ({ ...prev, [field.key]: options[currentIndex - 1] }));
      }

      if (direction === 'right' && currentIndex < options.length - 1) {
        setFormState((prev) => ({ ...prev, [field.key]: options[currentIndex + 1] }));
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

      // Update the issue using the Linear client
      client
        .updateIssue(issue.id, {
          title: formState.title,
          description: formState.description,
          priority: formState.priority,
          assigneeId: options.users.find((u) => u.name === formState.assignee)?.id,
          teamId: options.teams.find((t) => t.name === formState.team)?.id,
          projectId: options.projects.find((p) => p.name === formState.project)?.id,
          stateId: options.states.find((s) => s.name === formState.status)?.id,
        })
        .then(async (result) => {
          if (result.success && result.issue) {
            // Wait for the issue to resolve since it's a LinearFetch type
            const updatedIssue = await result.issue;
            onUpdate(updatedIssue);
            setSaveMessage({
              text: `Issue ${updatedIssue.identifier} saved at ${new Date().toLocaleTimeString()}`,
              type: 'success',
            });
          } else {
            setSaveMessage({ text: 'Failed to save issue', type: 'error' });
          }
        })
        .catch((error) => {
          setSaveMessage({ text: `Error: ${error.message}`, type: 'error' });
        })
        .finally(() => {
          setIsSaving(false);
        });
      return;
    }

    // Field navigation
    if (key.upArrow) {
      const currentIndex = fields.findIndex((f) => f.key === activeField);
      if (currentIndex > 0) {
        setActiveField(fields[currentIndex - 1].key);
        setSearchQuery(''); // Clear search when changing fields
        setSaveMessage(null); // Clear save message when navigating
      }
      return;
    }

    if (key.downArrow) {
      const currentIndex = fields.findIndex((f) => f.key === activeField);
      if (currentIndex < fields.length - 1) {
        setActiveField(fields[currentIndex + 1].key);
        setSearchQuery(''); // Clear search when changing fields
        setSaveMessage(null); // Clear save message when navigating
      }
      return;
    }

    // Field editing
    const field = fields.find((f) => f.key === activeField);
    if (!field) return;

    if (field.type === 'select') {
      if (field.key === 'assignee') {
        // Handle search input for assignee field
        if (input.length === 1 && /[a-zA-Z0-9]/.test(input)) {
          setSearchQuery((prev) => prev + input);
          const filteredUsers = getFilteredUsers();
          if (filteredUsers.length > 0) {
            setFormState((prev) => ({ ...prev, [field.key]: filteredUsers[0].name }));
          }
        } else if (key.backspace || key.delete) {
          setSearchQuery((prev) => prev.slice(0, -1));
          const filteredUsers = getFilteredUsers();
          if (filteredUsers.length > 0) {
            setFormState((prev) => ({ ...prev, [field.key]: filteredUsers[0].name }));
          }
        } else if (key.leftArrow || key.rightArrow) {
          handleSelectionChange(field, key.leftArrow ? 'left' : 'right');
        }
      } else {
        if (key.leftArrow) {
          handleSelectionChange(field, 'left');
        } else if (key.rightArrow) {
          handleSelectionChange(field, 'right');
        }
      }
    } else if (key.return) {
      handleFieldEdit(field);
    }
  });

  const tableData = [
    ['>', 'Field', 'Value', 'Help'],
    ...fields.map((field) => {
      const isActive = field.key === activeField;
      let value = formState[field.key];

      // Add emoji for status and priority
      if (field.key === 'status') {
        value = `${getStatusEmoji(value as string)} ${value}`;
      } else if (field.key === 'priority') {
        value = `${getPriorityEmoji(value as number)} ${value}`;
      }

      // Add search query display for assignee field
      if (field.key === 'assignee' && isActive && searchQuery) {
        value = `${value} (search: ${searchQuery})`;
      }

      return [
        isActive ? '▶' : ' ',
        formatTableCell(field.label, COLUMN_WIDTHS.field),
        formatTableCell(value, COLUMN_WIDTHS.value),
        formatTableCell(isActive ? field.help : '', COLUMN_WIDTHS.help),
      ];
    }),
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
      { alignment: 'left' as const, width: COLUMN_WIDTHS.cursor },
      { alignment: 'left' as const, width: COLUMN_WIDTHS.field },
      { alignment: 'left' as const, width: COLUMN_WIDTHS.value },
      { alignment: 'left' as const, width: COLUMN_WIDTHS.help },
    ],
    drawHorizontalLine: (index: number, size: number) => {
      // Draw lines between all rows
      return true;
    },
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>
          Press &apos;s&apos; to save, &apos;q&apos; or &apos;ESC&apos; to cancel, ↑↓ to navigate
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text bold>Editing Issue: {issue.identifier}</Text>
      </Box>

      <Box color="green">
        <Text bold inverse color="green">
          Issue Data
        </Text>
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
          <Text color="blue">Saving issue {issue.identifier}...</Text>
        </Box>
      )}

      {saveMessage && !isSaving && (
        <Box>
          <Text color={saveMessage.type === 'success' ? 'green' : 'red'}>{saveMessage.text}</Text>
        </Box>
      )}
    </Box>
  );
};

export default EditIssue;
