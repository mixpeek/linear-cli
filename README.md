WIP

# Linear CLI

A modern, user-friendly CLI client for [Linear](https://linear.app/) built with TypeScript. This CLI provides an improved developer experience for interacting with Linear's API.

## Features

- Modern TypeScript implementation
- Interactive CLI with beautiful UI using Ink
- Linear API support via @linear/sdk
- Type-safe command handling
- Comprehensive test coverage
- Modern development tooling

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Linear API key

## Installation

```bash
npm install -g linear-cli
# or
yarn global add linear-cli
```

## Setup

To use, you must set up a 'Personal API Key' in your Linear account, here: https://linear.app/mixpeek/settings/account/security

```bash
# Initialize the CLI with an API key
linear-cli init
```

## Usage

```bash
# List all issues
linear-cli issues list

# Create a new issue
linear-cli iisue create "Fix login bug" --description "Users unable to login on mobile"

# View issue details
linear-cli issues view ISSUE-123

```

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/mixpeek/linear-cli.git
cd linear-cli
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Build the project:
```bash
npm run build
# or
yarn build
```

4. Link the package for development:
```bash
npm link
# or
yarn link
```

## Available Scripts

- `npm run build` - Build the project
- `npm run dev` - Run in development mode with watch
- `npm run dev:run` - Run in development mode with watch and execute
- `npm run test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint


## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 