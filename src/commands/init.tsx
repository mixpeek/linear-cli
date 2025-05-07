import { Command } from 'commander';
import { LinearClient } from '@linear/sdk';
import { setApiKey } from '../config/linear.js';
import TextInput from 'ink-text-input';
import { render } from 'ink';
import React, { useState } from 'react';
import { homedir } from 'os';
import { join } from 'path';

const InitCommand = new Command('init')
  .description('Initialize Linear CLI with your API key')
  .action(async () => {
    const { stdin } = process;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const prompt = async (question: string): Promise<string> => {
      return new Promise((resolve) => {
        const { unmount } = render(
          React.createElement(() => {
            const [value, setValue] = useState('');
            return React.createElement(TextInput, {
              value,
              onChange: setValue,
              placeholder: 'Enter your Linear API key',
              onSubmit: (value: string) => {
                unmount();
                resolve(value);
              },
            });
          })
        );
      });
    };

    try {
      console.log('Please enter your Linear API key:');
      console.log('You can create a new API key under "Personal API Keys" at https://linear.app/mixpeek/settings/account/security');
      console.log('The API key will be stored securely in your system configuration');
      console.log(`Config location: ${join(homedir(), '.config/linear-cli/config.json')}\n`);

      const apiKey = await prompt('API Key: ');

      if (!apiKey) {
        console.error('Error: API key is required');
        process.exit(1);
      }

      // Validate the API key by attempting to create a client
      const client = new LinearClient({ apiKey });
      await client.viewer; // This will throw if the API key is invalid

      // Store the API key
      setApiKey(apiKey);

      console.log('\n✅ Successfully initialized Linear CLI!');
      console.log('You can now use the CLI to interact with your Linear workspace.');
    } catch (error) {
      console.error('\n❌ Error initializing Linear CLI:');
      if (error instanceof Error) {
        console.error(error.message);
      }
      process.exit(1);
    } finally {
      stdin.setRawMode(false);
      stdin.pause();
    }
  });

export default InitCommand; 