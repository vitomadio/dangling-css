#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const sass = require('sass');
const cssTree = require('css-tree');
const program = require('commander');

program
  .description('Check for unused selectors in a SCSS file based on an HTML file.')
  .parse(process.argv);

const currentDirectory = process.cwd();
const htmlFilePath = findHtmlFile(currentDirectory);

if (!htmlFilePath) {
  console.error('No HTML file found in the current directory.');
  process.exit(1);
}

const scssFilePath = htmlFilePath.replace(/\.html$/, '.scss');

if (!fs.existsSync(scssFilePath)) {
  console.error(`Corresponding SCSS file not found: ${scssFilePath}`);
  process.exit(1);
}

// Read HTML file and extract classes and IDs
const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
const selectorsInHtml = extractSelectorsFromHtml(htmlContent);

// Read SCSS file and find unused selectors
const scssContent = fs.readFileSync(scssFilePath, 'utf-8');
const selectorsInScss = extractSelectorsFromScss(scssContent);

const unusedSelectors = findUnusedSelectors(selectorsInScss, selectorsInHtml);

// Print unused selectors
if (unusedSelectors.length > 0) {
  console.log('Unused Selectors in SCSS:');
  console.log(unusedSelectors.join('\n'));
} else {
  console.log('No unused selectors found in the SCSS file.');
}

function findHtmlFile(directory) {
  const files = fs.readdirSync(directory);
  const htmlFiles = files.filter(file => path.extname(file) === '.html');

  return htmlFiles.length > 0 ? path.join(directory, htmlFiles[0]) : null;
}

function extractSelectorsFromHtml(html) {
  const selectorSet = new Set();
  const document = parse5.parse(html);

  function extractSelectorsFromNode(node) {
    if (node.attrs) {
      node.attrs.forEach(attr => {
        if (attr.name === 'class' || attr.name === 'id') {
          const selectors = attr.value.split(/\s+/);
          selectors.forEach(selector => selectorSet.add(selector));
        }
      });
    }

    if (node.childNodes) {
      node.childNodes.forEach(extractSelectorsFromNode);
    }
  }

  extractSelectorsFromNode(document);

  return Array.from(selectorSet);
}

function extractSelectorsFromScss(scss) {
  const result = sass.renderSync({
    data: scss,
    outputStyle: 'compressed', // Ensure all properties are on a single line
  });

  const cssContent = result.css.toString('utf-8');
  const ast = cssTree.parse(cssContent);

  const selectors = [];

  cssTree.walk(ast, node => {
    if (node.type === 'Rule') {
      cssTree.walk(node, ruleNode => {
        if (ruleNode.type === 'ClassSelector' || ruleNode.type === 'IdSelector') {
          selectors.push(ruleNode.name);
        }
      });
    }
  });

  return selectors;
}

function findUnusedSelectors(selectorsInScss, selectorsInHtml) {
  return selectorsInScss.filter(selector => !selectorsInHtml.includes(selector));
}
