import { Command } from 'commander';
import { getLinearClient } from '../../config/linear.js';
import { render } from 'ink';
import React from 'react';
import { Project } from '@linear/sdk';
import { ProjectNavigator } from '@/components/projects/ProjectNavigator.js';

const ListProjectsCommand = new Command('list')
  .description('List all projects')
  .option('-t, --team <name>', 'Filter by team name')
  .option('-l, --lead <name>', 'Filter by lead name')
  .option('-s, --state <state>', 'Filter by state')
  .action(async (options) => {
    try {
      const client = getLinearClient();
      
      // First get all teams to ensure we have the Engineering team
      const teams = await client.teams();
      const engineeringTeam = teams.nodes.find(team => team.name === 'Engineering');
      
      if (!engineeringTeam) {
        throw new Error('Engineering team not found');
      }

      // Now fetch projects with the team filter
      const projects = await client.projects({
        filter: {
          accessibleTeams: {
            id: { eq: engineeringTeam.id }
          },
          ...(options.lead && { lead: { name: { eq: options.lead } } }),
          ...(options.state && { state: { eq: options.state } }),
        },
        first: 100
      });
      
      // Fetch additional details for each project
      const projectsWithDetails = await Promise.all(
        projects.nodes.map(async (project) => {
          const lead = await project.lead;
          const teams = await project.teams();
          return {
            ...project,
            lead,
            teams
          } as unknown as Project;
        })
      );

      render(<ProjectNavigator initialProjects={projectsWithDetails} />);
    } catch (error) {
      console.error('Error listing projects:');
      if (error instanceof Error) {
        console.error(error.message);
      }
      process.exit(1);
    }
  });

export default ListProjectsCommand; 