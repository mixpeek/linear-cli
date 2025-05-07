// Status emoji mapping
export const getStatusEmoji = (status: string): string => {
  const statusMap: Record<string, string> = {
    'Ready': '⭕',
    'Planning': '📋',
    'In Review': '👀',
    'Todo': '📝',
    'Canceled': '⛔',
    'Done': '✅',
    'Duplicate': '🔄',
    'Backlog': '📚',
    'In Progress': '🚀',
  };
  return statusMap[status] || `❓ ${status}`;
};

// Priority emoji mapping
export const getPriorityEmoji = (priority: number): string => {
  const priorityMap: Record<number, string> = {
    0: '⚪',
    1: '🟢',
    2: '🟡',
    3: '🟠',
    4: '🔴',
  };
  return priorityMap[priority] || '⚪';
}; 