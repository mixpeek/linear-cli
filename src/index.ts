#!/usr/bin/env node

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import InitCommand from './commands/init.js';
import { ListIssuesCommand } from './commands/issues/list.js';
import ViewIssueCommand from '@/commands/issues/view.js';
import CreateIssueCommand from '@/commands/issues/create.js';
import ListProjectsCommand from '@/commands/projects/list.js';
import CreateProjectCommand from '@/commands/projects/create.js';
import ViewProjectCommand from '@/commands/projects/view.js';

// Read package.json for version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const program = new Command();

program
  .name('linear')
  .description('A modern CLI client for Linear')
  .version(pkg.version);

// Add init command
program.addCommand(InitCommand);

// Add issues command group
const issuesCommand = new Command('issues')
  .description('Manage Linear issues');

issuesCommand.addCommand(ListIssuesCommand);
issuesCommand.addCommand(ViewIssueCommand);
issuesCommand.addCommand(CreateIssueCommand);
program.addCommand(issuesCommand);

// Add projects command
const projectsCommand = new Command('projects')
  .description('Manage Linear projects');

projectsCommand.addCommand(ListProjectsCommand);
projectsCommand.addCommand(ViewProjectCommand);
projectsCommand.addCommand(CreateProjectCommand);
program.addCommand(projectsCommand);

program.parse(); 