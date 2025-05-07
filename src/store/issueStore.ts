import { create } from 'zustand';
import { Issue } from '@linear/sdk';

interface IssueState {
  issues: Issue[];
  currentIssue: Issue | null;
  setIssues: (issues: Issue[]) => void;
  setCurrentIssue: (issue: Issue | null) => void;
}

export const useIssueStore = create<IssueState>((set) => ({
  issues: [],
  currentIssue: null,
  setIssues: (issues) => set({ issues }),
  setCurrentIssue: (currentIssue) => set({ currentIssue })
}));