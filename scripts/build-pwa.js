#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🚀 Building PWA Static Assets...\n");

// Build the Next.js project
console.log("📦 Building Next.js project...");
try {
  execSync("pnpm build", { stdio: "inherit" });
  console.log("✅ Next.js build completed\n");
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}

// Create PWA distribution directory
const distDir = path.join(process.cwd(), "pwa-dist");
const nextOutputDir = path.join(process.cwd(), ".next");

console.log("📂 Creating PWA distribution directory...");
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy static files
console.log("📋 Copying static files...");
const filesToCopy = [
  { from: "public", to: "public" },
  { from: ".next/static", to: "_next/static" },
];

filesToCopy.forEach(({ from, to }) => {
  const fromPath = path.join(process.cwd(), from);
  const toPath = path.join(distDir, to);
  
  if (fs.existsSync(fromPath)) {
    fs.mkdirSync(path.dirname(toPath), { recursive: true });
    execSync(`cp -r "${fromPath}" "${path.dirname(toPath)}"`, { stdio: "inherit" });
    if (path.basename(fromPath) !== path.basename(toPath)) {
      fs.renameSync(path.join(path.dirname(toPath), path.basename(fromPath)), toPath);
    }
    console.log(`✅ Copied ${from} to ${to}`);
  } else {
    console.log(`⚠️  ${from} not found, skipping...`);
  }
});

// Copy HTML files from Next.js export
const exportDir = path.join(process.cwd(), ".next");
if (fs.existsSync(exportDir)) {
  console.log("📄 Copying HTML files...");
  // For static export, Next.js creates HTML files directly
  // We need to copy the generated static files
  try {
    // Copy server pages if they exist
    const serverDir = path.join(nextOutputDir, "server");
    if (fs.existsSync(serverDir)) {
      const serverDistDir = path.join(distDir, "_next/server");
      fs.mkdirSync(serverDistDir, { recursive: true });
      execSync(`cp -r "${serverDir}"/* "${serverDistDir}"/`, { stdio: "inherit" });
      console.log("✅ Copied server files");
    }
  } catch (error) {
    console.log("ℹ️  No server files to copy (static export)");
  }
}

// Create package info
console.log("📋 Creating package info...");
const packageInfo = {
  name: "Narratium PWA",
  version: require("../package.json").version,
  type: "PWA Static Build",
  buildDate: new Date().toISOString(),
  files: {
    serviceWorker: "public/sw.js",
    manifest: "public/manifest.json",
    icons: [
      "public/icon-48x48.png",
      "public/icon-72x72.png",
      "public/icon-96x96.png",
      "public/icon-144x144.png",
      "public/icon-192x192.png",
      "public/icon.png",
    ],
  },
  instructions: {
    deployment: "Upload all files to your web server root directory",
    requirements: "HTTPS required for PWA functionality",
    testing: "Access via HTTPS URL to test PWA features",
  },
};

fs.writeFileSync(
  path.join(distDir, "pwa-info.json"), 
  JSON.stringify(packageInfo, null, 2),
);

// Create README for PWA distribution
const readmeContent = `# Narratium PWA Distribution

This package contains the static assets for the Narratium PWA (Progressive Web App).

## Contents

- \`public/\` - Static assets including manifest, service worker, and icons
- \`_next/\` - Next.js compiled assets
- \`pwa-info.json\` - Build information and file listing

## Deployment Instructions

1. Upload all files to your web server root directory
2. Ensure your server supports HTTPS (required for PWA)
3. Configure your server to serve:
   - \`public/manifest.json\` with \`Content-Type: application/manifest+json\`
   - \`public/sw.js\` with \`Content-Type: application/javascript\`

## PWA Features

- ✅ Offline support via Service Worker
- ✅ App installation for mobile and desktop
- ✅ Multiple icon sizes for different devices
- ✅ Optimized caching strategy

## Testing

1. Access your deployed URL via HTTPS
2. Open browser developer tools
3. Check "Application" tab for PWA status
4. Look for install prompt or manual install option

Build Date: ${new Date().toISOString()}
Version: ${packageInfo.version}
`;

fs.writeFileSync(path.join(distDir, "README.md"), readmeContent);

console.log("\n🎉 PWA static assets built successfully!");
console.log(`📁 Distribution files located in: ${distDir}`);
console.log("\n📋 Next steps:");
console.log("1. Upload the contents of pwa-dist/ to your web server");
console.log("2. Ensure HTTPS is enabled");
console.log("3. Test PWA functionality in a browser");
console.log("\n💡 Tip: You can now update the download URLs in PWAInstallButton.tsx"); 
