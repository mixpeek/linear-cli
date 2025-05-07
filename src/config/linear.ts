import { LinearClient } from '@linear/sdk';
import Conf from 'conf';

const config = new Conf({
  projectName: 'linear-cli',
  schema: {
    apiKey: {
      type: 'string',
      default: '',
    },
    teamId: {
      type: 'string',
      default: '',
    },
  },
});

export const getLinearClient = (): LinearClient => {
  const apiKey = config.get('apiKey') as string;
  if (!apiKey) {
    throw new Error('Linear API key not found. Please set it using the config command.');
  }
  return new LinearClient({ apiKey });
};

export const setApiKey = (apiKey: string): void => {
  config.set('apiKey', apiKey);
};

export const getApiKey = (): string => {
  return config.get('apiKey') as string;
};

export const setTeamId = (teamId: string): void => {
  config.set('teamId', teamId);
};

export const getTeamId = (): string => {
  return config.get('teamId') as string;
}; 