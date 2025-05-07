import { Issue, LinearFetch, WorkflowState, User, Team, Project } from '@linear/sdk';

// Helper type to extract the actual type from a LinearFetch promise
export type Unwrap<T> = T extends LinearFetch<infer U> ? U : T;

// Helper types for common Linear entities
export type LinearWorkflowState = Unwrap<Issue['state']>;
export type LinearUser = Unwrap<Issue['assignee']>;
export type LinearTeam = Unwrap<Issue['team']>;
export type LinearProject = Unwrap<Issue['project']>; 