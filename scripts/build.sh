#!/bin/bash
set -ex

echo "🚀 Building RAG Contracts Library..."

# Set up npm authentication for GitHub packages
echo "@ondemandenv:registry=https://npm.pkg.github.com/" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=$github_token" >> .npmrc

ls -ltarh
cat .npmrc

# Verify package name matches expected contractsLib package name
PKG_NAME=$(jq -r '.name' package.json) && test "$PKG_NAME" != $ODMD_contractsLibPkgName || echo $PKG_NAME is good

# Install dependencies and build
echo "📦 Installing dependencies..."
npm install

echo "🔧 Compiling TypeScript..."
tsc --build

# Run tests (commented out for now, uncomment when ready)
echo "🧪 Running tests..."
npm run test

# >>>>
echo "📦 Packaging..."
PACK_OUTPUT_JSON=$(npm pack --json 2>/dev/null)

TGZ_FILENAME=$(echo "$PACK_OUTPUT_JSON" | jq -r '.[0].filename')
echo "INFO: Determined filename via --json: $TGZ_FILENAME"

# Verify the filename was found and the file exists
if [ -z "$TGZ_FILENAME" ] || [ ! -f "$TGZ_FILENAME" ]; then
    echo "ERROR: Could not determine packed filename or file '$TGZ_FILENAME' not found." >&2
    exit 1
fi
echo "INFO: Successfully packed: $TGZ_FILENAME"
ls -l "$TGZ_FILENAME"
#<<<<

# >>>>
echo "📤 Publishing package..."
PUBLISH_LOG=$(mktemp)

echo "Attempting to publish package..."
set -x
npm publish "$TGZ_FILENAME" 2>&1 | tee "$PUBLISH_LOG"
set -ex

# Capture the exit status of the 'npm publish' command (the first command in the pipe)
publish_status=${PIPESTATUS[0]}

# Check if npm publish failed (non-zero exit status)
if [ "$publish_status" -ne 0 ]; then
  # It failed. Now check if it was the E409 error.
  if grep -q "npm error code E409" "$PUBLISH_LOG"; then
    # It was the E409 error. Print a message and allow the script to continue.
    echo "INFO: npm publish failed with E409 (Conflict - version already exists). Ignoring error as requested."
  else
    # It was a different error. Print the log and exit with the original error code.
    echo "ERROR: npm publish failed with a non-E409 error (Exit Code: $publish_status):" >&2
    cat "$PUBLISH_LOG" >&2
    rm "$PUBLISH_LOG" # Clean up log file
    exit "$publish_status" # Exit the script with the actual error code
  fi
else
  # npm publish was successful (exit code 0)
  echo "INFO: npm publish successful."
fi

# Clean up the temporary log file if we haven't exited
rm "$PUBLISH_LOG"
# <<<<

# Set up git configuration
echo "🏷️  Tagging release..."
git config user.name $GITHUB_RUN_ID
git config user.email "odmd_wfl@ondemandenv.dev"
PKG_VER=$(jq -r '.version' package.json)

git tag "v$PKG_VER" && git tag "latest" -m "odmd" && git push origin --tags --force

# Create contractsLibLatest.txt for OndemandEnv platform
# This file contains contract lib enver's single producer information
echo "📝 Creating contract lib metadata..."
echo "$GITHUB_SHA,$PKG_NAME,$PKG_VER" > "$RUNNER_TEMP/contractsLibLatest.txt"

# Add dist-tag for the package
echo "🏷️  Adding dist-tag..."
npm dist-tag add $PKG_NAME@$PKG_VER $GITHUB_SHA --registry=https://npm.pkg.github.com

echo "✅ Build and publish complete!"
echo "📦 Package: $PKG_NAME@$PKG_VER"
echo "📁 File: $TGZ_FILENAME"
echo "🏷️  Tags: v$PKG_VER, latest" 