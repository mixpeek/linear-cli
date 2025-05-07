import { Command } from 'commander';
import { getLinearClient } from '../../config/linear.js';
import { render, Box, Text, useInput, useApp } from 'ink';
import React, { useState, useEffect } from 'react';
import { IssueDetails } from '@/components/issues/IssueDetails.js';
import { Issue } from '@linear/sdk';
import { createInterface } from 'readline';
import { writeFile, readFile, unlink, stat } from 'fs/promises';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { homedir } from 'os';
import { join } from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify';
import { openEditor } from '@/utils/editor.js';

const execAsync = promisify(exec);


interface CreateIssueOptions {
  title?: string;
  description?: string;
  state?: string;
  assignee?: string;
  project?: string;
  team?: string;
  interactive?: boolean;
  csv?: string;
  output?: string;
}

const getDefaultValues = async (): Promise<Partial<CreateIssueOptions>> => {
  try {
    const configPath = join(homedir(), '.linear-cli-defaults.json');
    const data = await readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
};

const saveDefaultValues = async (values: Partial<CreateIssueOptions>) => {
  try {
    const configPath = join(homedir(), '.linear-cli-defaults.json');
    await writeFile(configPath, JSON.stringify(values, null, 2));
  } catch (error) {
    console.error('Failed to save default values:', error);
  }
};

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

const CreateIssueCommand = new Command('create')
  .description('Create a new issue')
  .option('-t, --title <title>', 'Issue title')
  .option('-d, --description <description>', 'Issue description')
  .option('-s, --state <state>', 'Issue state (e.g., "Todo", "In Progress")')
  .option('-a, --assignee <name>', 'Assignee name')
  .option('-p, --project <name>', 'Project name')
  .option('-T, --team <name>', 'Team name')
  .option('-i, --interactive', 'Create issue interactively')
  .option('--csv <file>', 'Create issues from CSV file')
  .option('-o, --output <file>', 'Output results to CSV file (defaults to stdout)')
  .action(async (options: CreateIssueOptions) => {
    try {
      const client = getLinearClient();
      const defaults = await getDefaultValues();

      if (options.csv) {
        // Bulk creation mode
        const csvContent = await readFile(options.csv, 'utf-8');
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          escape: '\\',  // Allow escaped characters
          quote: '"',    // Use double quotes for fields
          relax_quotes: true,  // Be more lenient with quotes
          trim: true     // Trim whitespace
        });

        const results = [];
        const errors = [];

        // Get default team if not specified in CSV
        const defaultTeam = options.team ? 
          (await client.team(options.team)).id : 
          (await client.teams()).nodes[0].id;

        for (const record of records) {
          try {
            // Validate required fields
            if (!record.title) {
              throw new Error('Title is required');
            }

            // Clean and validate description
            let description = record.description;
            if (description) {
              // Remove any BOM or special characters that might have been introduced
              description = description.replace(/^\uFEFF/, '').trim();
              
              // If description is just quotes, treat it as empty
              if (description === '""' || description === "''") {
                description = '';
              }
            }

            // Get state ID if specified
            let stateId;
            if (record.state) {
              const state = await client.workflowState(record.state);
              stateId = state.id;
            }

            // Get assignee ID if specified
            let assigneeId;
            if (record.assignee) {
              const assignee = await client.user(record.assignee);
              assigneeId = assignee.id;
            }

            // Get project ID if specified
            let projectId;
            if (record.project) {
              const project = await client.project(record.project);
              projectId = project.id;
            }

            // Get team ID if specified
            let teamId = defaultTeam;
            if (record.team) {
              const team = await client.team(record.team);
              teamId = team.id;
            }

            // Create the issue
            const issueResponse = await client.createIssue({
              title: record.title,
              description: description || undefined, // Only include if not empty
              stateId,
              assigneeId,
              projectId,
              teamId,
            });

            if (!issueResponse.success) {
              throw new Error('Failed to create issue');
            }

            // Fetch the created issue to get its URL
            const issue = await client.issue(issueResponse.issue); 
            
            results.push({
              title: record.title,
              identifier: issue.identifier,
              url: issue.url,
              status: 'success'
            });
          } catch (error) {
            errors.push({
              title: record.title,
              error: error instanceof Error ? error.message : 'Unknown error',
              status: 'error'
            });
          }
        }

        // Combine results and errors
        const output = [...results, ...errors];

        // Output results
        const outputCsv = stringify(output, {
          header: true,
          columns: ['title', 'identifier', 'url', 'status', 'error'],
          quoted: true,  // Quote all fields
          quoted_empty: true  // Quote empty fields
        });

        if (options.output) {
          await writeFile(options.output, outputCsv);
        } else {
          console.log(outputCsv);
        }

        // Print summary
        console.error(`\nCreated ${results.length} issues successfully`);
        if (errors.length > 0) {
          console.error(`Failed to create ${errors.length} issues`);
        }
      } else if (options.interactive) {
        // Interactive mode
        console.log('Creating a new issue (press Ctrl+C to cancel)\n');

        const issueData: Partial<CreateIssueOptions> = {};

        issueData.title = await promptUser('Title', defaults.title);
        if (!issueData.title) {
          console.error('Title is required');
          process.exit(1);
        }

        const issueDescription = await promptUser('Description (will open editor)', defaults.description);
        issueData.description = await openEditor(issueDescription, 'md');

        // Fetch available options for selection
        const teamId = options.team ? 
          (await client.team(options.team)).id : 
          (await client.teams()).nodes[0].id;

        const selectedTeam = await client.team(teamId);
        const states = await selectedTeam.states();
        const defaultState = states.nodes.find(state => state.name === 'Backlog') || states.nodes[0];

        // State selection
        console.log('\nAvailable states:');
        states.nodes.forEach((state, i) => console.log(`${i + 1}. ${state.name}`));
        const stateIndex = parseInt(await promptUser('Select state number', 
          String(states.nodes.findIndex(state => state.name === 'Backlog') + 1)
        )) - 1;
        const selectedState = states.nodes[stateIndex];
        if (!selectedState) {
          console.error('Invalid state selection');
          process.exit(1);
        }

        // Assignee selection
        const users = await client.users();
        console.log('\nAvailable assignees:');
        users.nodes.forEach((user, i) => console.log(`${i + 1}. ${user.name}`));
        const assigneeIndex = parseInt(await promptUser('Select assignee number (0 for none)', '0')) - 1;
        const selectedUser = assigneeIndex >= 0 ? users.nodes[assigneeIndex] : undefined;

        // Project selection
        const projects = await client.projects();
        console.log('\nAvailable projects:');
        projects.nodes.forEach((project, i) => console.log(`${i + 1}. ${project.name}`));
        const projectIndex = parseInt(await promptUser('Select project number (0 for none)', '0')) - 1;
        const selectedProject = projectIndex >= 0 ? projects.nodes[projectIndex] : undefined;

        // Team selection
        console.log('\nAvailable teams:');
        console.log(`${teamId}. ${selectedTeam.name}`);

        // Create the issue with IDs
        const issueResponse = await client.createIssue({
          title: issueData.title!,
          description: issueData.description,
          stateId: issueData.state ? 
            (await client.workflowState(issueData.state)).id : 
            defaultState.id,
          assigneeId: selectedUser?.id,
          projectId: selectedProject?.id,
          teamId: teamId,
        });

        if (!issueResponse.success) {
          throw new Error('Failed to create issue');
        }

        // Save only team, assignee, status, and project as defaults
        await saveDefaultValues({
          state: selectedState.name,
          assignee: selectedUser?.name,
          project: selectedProject?.name,
          team: selectedTeam.name,
        });

        // Fetch the complete issue data
        const fullIssue = await client.issue(issueResponse.issue);
        const state = await fullIssue.state;
        const assignee = await fullIssue.assignee;
        const project = await fullIssue.project;
        const issueTeam = await fullIssue.team;

        const issueWithData = {
          id: fullIssue.id,
          identifier: fullIssue.identifier,
          title: fullIssue.title,
          description: fullIssue.description,
          state,
          assignee,
          project,
          team: issueTeam,
          createdAt: fullIssue.createdAt,
          completedAt: fullIssue.completedAt,
          updatedAt: fullIssue.updatedAt,
          url: fullIssue.url,
        } as Issue;

        // Display the created issue
        render(<IssueDetails 
          issue={issueWithData} 
          onBack={() => process.exit(0)} 
          onEdit={() => {}} // No-op since we don't support editing in this context
        />);
      } else {
        // CLI flag mode
        const issueData: Partial<CreateIssueOptions> = {
          ...defaults,
          ...options
        };

        // Create the issue
        const teamId = issueData.team ? 
          (await client.team(issueData.team)).id : 
          (await client.teams()).nodes[0].id;

        const selectedTeam = await client.team(teamId);
        const states = await selectedTeam.states();
        const defaultState = states.nodes.find(state => state.name === 'Backlog') || states.nodes[0];

        const issueResponse = await client.createIssue({
          title: issueData.title!,
          description: issueData.description,
          stateId: issueData.state ? 
            (await client.workflowState(issueData.state)).id : 
            defaultState.id,
          assigneeId: issueData.assignee ? (await client.user(issueData.assignee)).id : undefined,
          projectId: issueData.project ? (await client.project(issueData.project)).id : undefined,
          teamId: teamId,
        });

        if (!issueResponse.success) {
          throw new Error('Failed to create issue');
        }

        // Save only team, assignee, status, and project as defaults
        await saveDefaultValues({
          state: issueData.state,
          assignee: issueData.assignee,
          project: issueData.project,
          team: issueData.team,
        });

        // Fetch the complete issue data
        const fullIssue = await client.issue(issueResponse.issue);
        const state = await fullIssue.state;
        const assignee = await fullIssue.assignee;
        const project = await fullIssue.project;
        const issueTeam = await fullIssue.team;

        const issueWithData = {
          id: fullIssue.id,
          identifier: fullIssue.identifier,
          title: fullIssue.title,
          description: fullIssue.description,
          state,
          assignee,
          project,
          team: issueTeam,
          createdAt: fullIssue.createdAt,
          completedAt: fullIssue.completedAt,
          updatedAt: fullIssue.updatedAt,
          url: fullIssue.url,
        } as Issue;

        // Display the created issue
        render(<IssueDetails 
          issue={issueWithData} 
          onBack={() => process.exit(0)} 
          onEdit={() => {}} // No-op since we don't support editing in this context
        />);
      }
    } catch (error) {
      console.error('Error creating issue:');
      if (error instanceof Error) {
        console.error(error.message);
      }
      process.exit(1);
    }
  });

export default CreateIssueCommand;