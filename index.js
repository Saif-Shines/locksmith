#!/usr/bin/env node

import welcome from 'cli-welcome';
import boxen from 'boxen';

welcome({
  title: 'Locksmith CLI',
  tagLine: 'Seamlessly add authentication infrastructure to AI applications',
  description: 'Built for developers by Saif',
  bgColor: '#36BB82',
  color: '#000000',
  bold: true,
  clear: true,
});

console.log(
  boxen('Hello World', {
    padding: 1,
    margin: 1,
    borderStyle: 'classic',
    borderColor: 'green',
  })
);
