#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const cssTree = require('css-tree');
const program = require('commander');

program
  .description('Check for unused CSS classes in an HTML file and corresponding SCSS or CSS file.')
  .option('-h, --html <htmlFile>', 'Path to the HTML file')
  .parse(process.argv);

if (!program.html) {
  console.error('Please provide the path to the HTML file using the -h/--html option.');
  process.exit(1);
}

const htmlFilePath = path.resolve(process.cwd(), program.html);
const cssFilePath = htmlFilePath.replace(/\.html$/, /\.(scss|css)$/);

if (!fs.existsSync(htmlFilePath)) {
  console.error(`HTML file not found: ${htmlFilePath}`);
  process.exit(1);
}

if (!fs.existsSync(cssFilePath)) {
  console.error(`Corresponding CSS/SCSS file not found: ${cssFilePath}`);
  process.exit(1);
}

// Read HTML file and extract class names
const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
const classList = extractClassListFromHtml(htmlContent);

// Read CSS/SCSS file and find unused classes
const cssContent = fs.readFileSync(cssFilePath, 'utf-8');
const unusedClasses = findUnusedClasses(classList, cssContent);

// Print unused classes
if (unusedClasses.length > 0) {
  console.log('Unused CSS Classes:');
  console.log(unusedClasses.join('\n'));
} else {
  console.log('No unused CSS classes found.');
}

function extractClassListFromHtml(html) {
  const classList = [];
  const document = parse5.parse(html);

  function extractClassesFromNode(node) {
    if (node.attrs) {
      const classAttribute = node.attrs.find(attr => attr.name === 'class');

      if (classAttribute) {
        const classes = classAttribute.value.split(/\s+/);
        classList.push(...classes);
      }
    }

    if (node.childNodes) {
      node.childNodes.forEach(extractClassesFromNode);
    }
  }

  extractClassesFromNode(document);

  return classList;
}

function findUnusedClasses(usedClasses, cssContent) {
  const ast = cssTree.parse(cssContent);

  const foundClasses = new Set();
  const unusedClasses = [];

  function collectClassesFromRule(rule) {
    cssTree.walk(rule, node => {
      if (node.type === 'ClassSelector') {
        foundClasses.add(node.name);
      }
    });
  }

  cssTree.walk(ast, node => {
    if (node.type === 'Rule') {
      collectClassesFromRule(node);
    }
  });

  usedClasses.forEach(usedClass => {
    foundClasses.delete(usedClass);
  });

  foundClasses.forEach(unusedClass => {
    unusedClasses.push(`.${unusedClass}`);
  });

  return unusedClasses;
}
