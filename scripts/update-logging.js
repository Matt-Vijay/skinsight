/**
 * Script to update console.log statements to use the logger utility
 * 
 * This script can be run with:
 * node scripts/update-logging.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Define directories to scan
const sourceDirs = [
  'src',
  'App.tsx'
];

// Function to run a shell command and return the output
const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
};

// Find all files with console.log statements
const findConsoleLogFiles = async () => {
  try {
    // Use grep to find all files with console.log statements
    const grepCommand = `grep -r "console\\.log\\|console\\.warn\\|console\\.error" --include="*.ts" --include="*.tsx" ${sourceDirs.join(' ')}`;
    const result = await runCommand(grepCommand);
    
    // Parse the grep output to get file paths
    const files = new Set();
    result.split('\n').forEach(line => {
      const filePath = line.split(':')[0];
      if (filePath) {
        files.add(filePath);
      }
    });
    
    return Array.from(files);
  } catch (error) {
    console.error('Error finding files:', error);
    return [];
  }
};

// Update each file to use the logger utility
const updateFile = (filePath) => {
  try {
    console.log(`Processing ${filePath}...`);
    
    // Read the file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the logger import is already present
    const hasLoggerImport = content.includes("import { logger } from '@/config/logger'");
    
    // Add the logger import if it's not already there
    if (!hasLoggerImport) {
      // Find a good place to add the import
      if (content.includes('import React')) {
        // Add after the last import statement
        const lastImportIndex = content.lastIndexOf('import ');
        const endOfLastImport = content.indexOf(';', lastImportIndex) + 1;
        
        // Insert our import after the last import
        content = 
          content.substring(0, endOfLastImport) + 
          "\nimport { logger } from '@/config/logger';" + 
          content.substring(endOfLastImport);
      } else {
        // Add at the beginning of the file
        content = "import { logger } from '@/config/logger';\n\n" + content;
      }
    }
    
    // Replace console.log statements with logger.debug
    content = content.replace(/console\.log\(/g, 'logger.debug(');
    
    // Replace console.warn statements with logger.warn
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    
    // Replace console.error statements with logger.error
    content = content.replace(/console\.error\(/g, 'logger.error(');
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content);
    
    console.log(`✅ Updated ${filePath}`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
};

// Main function
const main = async () => {
  try {
    // Find all files with console.log statements
    const files = await findConsoleLogFiles();
    console.log(`Found ${files.length} files with console.log statements.`);
    
    // Update each file
    for (const file of files) {
      updateFile(file);
    }
    
    console.log('Done! 🎉');
  } catch (error) {
    console.error('Error:', error);
  }
};

// Run the script
main(); 