import { Issue, LinearFetch, WorkflowState, User, Team, Project } from '@linear/sdk';

export const getStatusName = async (state: LinearFetch<WorkflowState> | null | undefined): Promise<string> => {
  if (!state) return '';
  const resolvedState = await state;
  return resolvedState.name || '';
};

export const getUserName = async (user: LinearFetch<User> | null | undefined): Promise<string> => {
  if (!user) return 'Unassigned';
  const resolvedUser = await user;
  return resolvedUser.name || 'Unassigned';
};

export const getTeamName = async (team: LinearFetch<Team> | null | undefined): Promise<string> => {
  if (!team) return 'No Team';
  const resolvedTeam = await team;
  return resolvedTeam.name || 'No Team';
};

export const getProjectName = async (project: LinearFetch<Project> | null | undefined): Promise<string> => {
  if (!project) return 'No Project';
  const resolvedProject = await project;
  return resolvedProject.name || 'No Project';
}; 