import { Command } from 'commander';
import { getLinearClient } from '../../config/linear.js';
import { render } from 'ink';
import React, { useState } from 'react';
import { Project } from '@linear/sdk';
import { ProjectDetails } from '@/components/projects/ProjectDetails.js';
import EditProject from '@/components/projects/EditProject.js';

type ViewMode = 'details' | 'edit';

const ViewProjectCommand = new Command('view')
  .description('View a specific project by its ID')
  .argument('<id>', 'Project ID')
  .action(async (id: string) => {
    try {
      const client = getLinearClient();
      if (!id) {
        console.error(`No project ID given.`);
        process.exit(1);
      }
      const project = await client.project(id);

      const ViewProject = () => {
        const [viewMode, setViewMode] = useState<ViewMode>('details');
        const [currentProject, setCurrentProject] = useState<Project>(project);

        const handleProjectUpdate = (updatedProject: Project) => {
          setCurrentProject(updatedProject);
        };

        return viewMode === 'edit' ? (
          <EditProject
            project={currentProject}
            onBack={() => setViewMode('details')}
            onUpdate={handleProjectUpdate}
          />
        ) : (
          <ProjectDetails 
            project={currentProject} 
            onBack={() => process.exit(0)}
          />
        );
      };

      render(<ViewProject />);
    } catch (error) {
      console.error('Error fetching project:');
      if (error instanceof Error) {
        console.error(error.message);
      }
      process.exit(1);
    }
  });

export default ViewProjectCommand; 