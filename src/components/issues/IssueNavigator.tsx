import React, { useState } from 'react';
import { Box, useInput } from 'ink';
import { Issue } from '@linear/sdk';
import { useIssueStore } from '@/store/issueStore.js';
import { IssueList } from '@/components/issues/IssueList.js';
import { IssueDetails } from '@/components/issues/IssueDetails.js';
import EditIssue from '@/components/issues/EditIssue.js';

interface IssueNavigatorProps {
  initialIssues: Issue[];
}

type ViewMode = 'list' | 'details' | 'edit';

export const IssueNavigator: React.FC<IssueNavigatorProps> = ({ initialIssues }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortedIssues, setSortedIssues] = useState<Issue[]>([]);
  const { 
    issues,
    currentIssue,
    setIssues,
    setCurrentIssue
  } = useIssueStore();

  // Initialize issues when the app starts
  React.useEffect(() => {
    setIssues(initialIssues);
  }, [initialIssues, setIssues]);

  // Handle keyboard input
  useInput((input, key) => {
    if (viewMode === 'list') {
      if (input === 'q') {
        process.exit(0);
      }

      if (key.upArrow || key.downArrow) {
        const currentIndex = sortedIssues.findIndex(issue => 
          issue.identifier === (currentIssue?.identifier || sortedIssues[0]?.identifier)
        );
        let newIndex = currentIndex;
        
        if (key.upArrow && currentIndex > 0) {
          newIndex = currentIndex - 1;
        }
        if (key.downArrow && currentIndex < sortedIssues.length - 1) {
          newIndex = currentIndex + 1;
        }
        
        setCurrentIssue(sortedIssues[newIndex]);
      }

      if (key.return) {
        const selectedIssue = currentIssue || sortedIssues[0];
        setCurrentIssue(selectedIssue);
        setViewMode('details');
      }

      if (input === 'e') {
        const selectedIssue = currentIssue || sortedIssues[0];
        setCurrentIssue(selectedIssue);
        setViewMode('edit');
      }
    } else {
      if (input === 'q') {
        setViewMode('list');
      }
    }
  });

  // Handle issue update
  const handleIssueUpdate = (updatedIssue: Issue) => {
    // Update the current issue in the store
    setCurrentIssue(updatedIssue);
    // Don't change view mode - stay in edit mode
  };

  return (
    <Box flexDirection="column">
      {viewMode === 'list' ? (
        <IssueList
          issues={issues}
          activeIssueId={currentIssue?.identifier || sortedIssues[0]?.identifier}
          onSortedIssues={setSortedIssues}
        />
      ) : viewMode === 'edit' ? (
        <EditIssue
          issue={currentIssue!}
          onBack={() => setViewMode('list')}
          onUpdate={handleIssueUpdate}
        />
      ) : (
        <IssueDetails
          issue={currentIssue!}
          onBack={() => setViewMode('list')}
          onEdit={() => setViewMode('edit')}
          onUpdate={handleIssueUpdate}
        />
      )}
    </Box>
  );
}; 