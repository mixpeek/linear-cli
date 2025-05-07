import React, { useState } from 'react';
import { Box, useInput } from 'ink';
import { Project } from '@linear/sdk';
import { useProjectStore } from '@/store/projectStore.js';
import { ProjectList } from '@/components/projects/ProjectList.js';
import { ProjectDetails } from '@/components/projects/ProjectDetails.js';
import EditProject from '@/components/projects/EditProject.js';

interface ProjectNavigatorProps {
  initialProjects: Project[];
}

type ViewMode = 'list' | 'details' | 'edit';

export const ProjectNavigator: React.FC<ProjectNavigatorProps> = ({ initialProjects }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortedProjects, setSortedProjects] = useState<Project[]>([]);
  const { 
    projects,
    currentProject,
    setProjects,
    setCurrentProject
  } = useProjectStore();

  // Initialize projects when the app starts
  React.useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects, setProjects]);

  // Handle keyboard input
  useInput((input, key) => {
    if (viewMode === 'list') {
      if (input === 'q') {
        process.exit(0);
      }

      if (key.upArrow || key.downArrow) {
        const currentIndex = sortedProjects.findIndex(project => 
          project.id === (currentProject?.id || sortedProjects[0]?.id)
        );
        let newIndex = currentIndex;
        
        if (key.upArrow && currentIndex > 0) {
          newIndex = currentIndex - 1;
        }
        if (key.downArrow && currentIndex < sortedProjects.length - 1) {
          newIndex = currentIndex + 1;
        }
        
        setCurrentProject(sortedProjects[newIndex]);
      }

      if (key.return) {
        const selectedProject = currentProject || sortedProjects[0];
        setCurrentProject(selectedProject);
        setViewMode('details');
      }

      if (input === 'e') {
        const selectedProject = currentProject || sortedProjects[0];
        setCurrentProject(selectedProject);
        setViewMode('edit');
      }
    } else {
      if (input === 'q') {
        setViewMode('list');
      }
    }
  });

  // Handle project update
  const handleProjectUpdate = (updatedProject: Project) => {
    // Update the current project in the store
    setCurrentProject(updatedProject);
    // Don't change view mode - stay in edit mode
  };

  return (
    <Box flexDirection="column">
      {viewMode === 'list' ? (
        <ProjectList
          projects={projects}
          activeProjectId={currentProject?.id || sortedProjects[0]?.id}
          onSortedProjects={setSortedProjects}
        />
      ) : viewMode === 'edit' ? (
        <EditProject
          project={currentProject!}
          onBack={() => setViewMode('list')}
          onUpdate={handleProjectUpdate}
        />
      ) : (
        <ProjectDetails
          project={currentProject!}
          onBack={() => setViewMode('list')}
          onEdit={() => setViewMode('edit')}
          onUpdate={handleProjectUpdate}
        />
      )}
    </Box>
  );
}; 