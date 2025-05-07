import { Command } from 'commander';
import { getLinearClient } from '@/config/linear.js';
import { createInterface } from 'readline';
import { Project } from '@linear/sdk';

interface CreateProjectOptions {
  name?: string;
  description?: string;
  state?: string;
  lead?: string;
  team?: string;
  startDate?: string;
  targetDate?: string;
  interactive?: boolean;
}

const promptUser = async (question: string, defaultValue?: string): Promise<string> => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${question}${defaultValue ? ` (${defaultValue})` : ''}: `, (answer) => {
      rl.close();
      resolve(answer || defaultValue || '');
    });
  });
};

const CreateProjectCommand = new Command('create')
  .description('Create a new project')
  .option('-n, --name <name>', 'Project name')
  .option('-d, --description <description>', 'Project description')
  .option('-s, --state <state>', 'Project state (e.g., "Planning", "In Progress")')
  .option('-l, --lead <name>', 'Project lead name')
  .option('-t, --team <name>', 'Team name')
  .option('--start-date <date>', 'Project start date (YYYY-MM-DD)')
  .option('--target-date <date>', 'Project target date (YYYY-MM-DD)')
  .option('-i, --interactive', 'Create project interactively')
  .action(async (options: CreateProjectOptions) => {
    try {
      const client = getLinearClient();

      if (options.interactive) {
        console.log('Creating a new project (press Ctrl+C to cancel)\n');

        const name = await promptUser('Project name');
        if (!name) {
          console.error('Project name is required');
          process.exit(1);
        }

        const description = await promptUser('Description');

        // Fetch available options
        const users = await client.users();
        const teams = await client.teams();

        // Lead selection
        console.log('\nAvailable leads:');
        users.nodes.forEach((user, i) => console.log(`${i + 1}. ${user.name}`));
        const leadIndex = parseInt(await promptUser('Select lead number (0 for none)', '0')) - 1;
        const selectedLead = leadIndex >= 0 ? users.nodes[leadIndex] : undefined;

        // Team selection
        console.log('\nAvailable teams:');
        teams.nodes.forEach((team, i) => console.log(`${i + 1}. ${team.name}`));
        const teamIndex = parseInt(await promptUser('Select team number', '1')) - 1;
        const selectedTeam = teams.nodes[teamIndex];

        // Date inputs
        const startDate = await promptUser('Start date (YYYY-MM-DD)');
        const targetDate = await promptUser('Target date (YYYY-MM-DD)');

        // Create the project
        const project = await client.createProject({
          name,
          description,
          leadId: selectedLead?.id,
          teamId: selectedTeam.id,
          startDate: startDate || undefined,
          targetDate: targetDate || undefined,
        });

        console.log(`\nProject created successfully: ${project.name} (${project.identifier})`);
      } else {
        // CLI flag mode
        if (!options.name) {
          console.error('Project name is required');
          process.exit(1);
        }

        // Get lead ID if specified
        let leadId;
        if (options.lead) {
          const lead = await client.user(options.lead);
          leadId = lead.id;
        }

        // Get team ID if specified
        let teamId;
        if (options.team) {
          const team = await client.team(options.team);
          teamId = team.id;
        } else {
          // Use first team if none specified
          const teams = await client.teams();
          teamId = teams.nodes[0].id;
        }

        // Create the project
        const project = await client.createProject({
          name: options.name,
          description: options.description,
          leadId,
          teamId,
          startDate: options.startDate,
          targetDate: options.targetDate,
        });

        console.log(`\nProject created successfully: ${project.name} (${project.identifier})`);
      }
    } catch (error) {
      console.error('Error creating project:');
      if (error instanceof Error) {
        console.error(error.message);
      }
      process.exit(1);
    }
  });

export default CreateProjectCommand; 