import { spawnSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

/**
 * Opens the system editor to edit content and returns the edited content.
 * Uses spawnSync with stdio: 'inherit' to properly handle terminal control.
 */
export const openEditor = (
  initialContent: string = '',
  fileExtension: string = 'md'
): string => {
  // Create a unique temp file
  const tempFileName = `linear-edit-${randomBytes(6).toString('hex')}.${fileExtension}`;
  const tempFile = join(tmpdir(), tempFileName);
  
  try {
    // Write initial content to temp file
    writeFileSync(tempFile, initialContent);
    
    // Get editor from environment or default to vim
    const editor = process.env.EDITOR || 'vim';

    // Launch editor with direct terminal access
    // Using spawnSync with stdio: 'inherit' gives complete terminal control to the editor
    const result = spawnSync(editor, [tempFile], {
      stdio: 'inherit'
    });

    if (result.status !== 0) {
      throw new Error(`Editor process exited with status ${result.status}`);
    }

    // Read the edited content
    const editedContent = readFileSync(tempFile, 'utf-8');
    return editedContent.trim();
  } finally {
    // Clean up temp file
    try {
      unlinkSync(tempFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}; 