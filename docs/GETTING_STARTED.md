# Getting Started with Narratium.ai

This guide will help you get Narratium.ai up and running on your system.

## Prerequisites

- Node.js (v16 or higher)
- pnpm (recommended) or npm
- Git

## Installation Steps

### 1. Clone the project

```bash
git clone https://github.com/Narratium/Narratium.ai.git
cd Narratium
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Run the project

```bash
pnpm run dev
```

Once the development server starts, visit: [http://localhost:3000](http://localhost:3000)

## Self-packaging

If you want to create a standalone application:

1. First, install the pake-cli globally:
```bash
npm install -g pake-cli
```

2. Then, depending on your operating system, run one of the following commands:

For Docker:
```bash
docker-compose up --build
```

For macOS:
```bash
pnpm pake-mac
```

For Linux:
```bash
pnpm pake-linux
```

For Windows:
```bash
pnpm pake-win
```

For Android & IOS
```bash
pnpm build:pwa
```

### Troubleshooting

#### macOS Installation Fix

If you encounter a "damaged" display after installation on macOS, run this command in terminal:

```bash
xattr -d com.apple.quarantine /Applications/Narratium.app
```

## Next Steps

- Check out our [documentation](https://deepwiki.com/Narratium/Narratium.ai/) for detailed guides
- Join our community for support and updates
- Star the repository to stay updated with new releases