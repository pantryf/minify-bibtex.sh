/// A tool to shorten author, editor, journal, and booktitle in a BibTeX file.
/// Copyright (c) 2023 Subhajit Sahu [MIT]

// EXAMPLE:
// $ node index.js input.bib output.bib
// # output.bib has author, editor, journal, and booktitle shortened.
// NOTE:
// Don't reveal this to your professor.
// Say you are doing clerical work.
const os = require('os');
const fs = require('fs');




// Read a file.
function readFile(pth) {
  var d = fs.readFileSync(pth, 'utf8');
  return d.replace(/\r?\n|\r/g, '\n');
}
// Write a file.
function writeFile(pth, d) {
  d = d.replace(/\r?\n|\r/g, os.EOL);
  fs.writeFileSync(pth, d);
}


// Find index of next match excluding brackets and quotes.
function searchInExpression(txt, match, start) {
  var brackets = 0, quotes = 0;
  for (var i=start, I=txt.length; i<I; ++i) {
    if (txt[i].search(match)===0 && brackets===0 && quotes===0) return i;
    if (txt[i]==='\\') { ++i; continue; }
    if (txt[i]==='"') quotes = quotes>0? 0 : 1;
    if (txt[i].search(/[\{\[\(]/)===0) ++brackets;
    if (txt[i].search(/[\}\]\)]/)===0) --brackets;
  }
  return -1;
}


// Parse a BibTeX entry as {type, key, value}.
function parseEntry(txt) {
  var type = txt.replace(/@(\w+)\s*[\s\S]*/, '$1').trim().toLowerCase();
  var key  = txt.replace(/@\w+\s*\{\s*([\w-]+)[\s\S]*/,      '$1').trim();
  var body = txt.replace(/@\w+\s*\{\s*[\w-]+,([\s\S]+?)\}$/, '$1').trim();
  var fields = new Map();
  for (var i=0, I=body.length; i<I;) {
    let j = searchInExpression(body, /,/, i);
    if (j<0) j = I;
    var field = body.substring(i, j);
    let type  = field.replace(/\s*(\w+).*/, '$1').toLowerCase();
    let value = field.replace(/\s*\w+\s*=/, '')
    value = value.replace(/^\s*(.*?)\s*,\s*$/,   '$1').trim();
    value = value.replace(/^[\"\{](.*?)[\"\}]$/, '$1').trim();
    if (type) fields.set(type, value);
    i = j + 1;
  }
  return {type, key, fields};
}
// Stringify a BibTeX entry.
function stringifyEntry(entry) {
  var lines = [];
  for (var [type, value] of entry.fields)
    lines.push(`  ${type}={${value}},`);
  return `@${entry.type}{${entry.key},\n${lines.join('\n')}\n}`
}


// Shorten given name of an author.
function shortenAuthor(txt) {
  txt = txt.replace(/\s*~\s*/g, ' ').replace(/\s+/, ' ');
  txt = txt.split(',').map(w => w.trim()).reverse().join(' ');
  txt = txt.split('~').reverse().join(', ');
  var words = txt.split(' '), last = words.pop().trim();
  var given = words.map(w => w.trim()[0] + '.').join('');
  return words.length > 0? `${last}, ${given}` : last;
}
// Shorten given names of authors.
function shortenFieldAuthor(txt) {
  txt = txt.replace(/\{(.*?)\}/g, m => m.replace(/\s+/g, '?'));
  txt = txt.split(/\s+and\s+/i).map(shortenAuthor).join(' and ');
  txt = txt.replace(/\?/g, ' ');
  return txt;
}
// Shorten journal by removing year.
function shortenFieldJournal(txt) {
  txt = txt.replace(/\d{4}/g, '').replace(/\s+/g, ' ');
  return txt.trim();
}


// Process each BibTeX entry.
function forEachEntry(txt, fn) {
  var re = /@\w+\s*\{/g;
  var a  = '', I = 0, m = null;
  while ((m = re.exec(txt)) != null) {
    var i = m.index;
    var L = m[0].length;
    a += txt.substring(I, i);
    I  = searchInExpression(txt, /\}/, i+L);
    if (I===-1) break;
    var entry = parseEntry(txt.substring(i, ++I));
    a += stringifyEntry(fn(entry));
  }
  a += txt.substring(I);
  return a;
}




// NOTE:
// Customize you work here.
function main(argv) {
  var inp = argv[2];  // input file
  var out = argv[3];  // output file
  var txt = readFile(inp);
  var txt = forEachEntry(txt, entry => {
    var author    = entry.fields.get('author');
    if (author)     entry.fields.set('author', shortenFieldAuthor(author));
    var editor    = entry.fields.get('editor');
    if (editor)     entry.fields.set('editor', shortenFieldAuthor(editor));
    var journal   = entry.fields.get('journal');
    if (journal)    entry.fields.set('journal', shortenFieldJournal(journal));
    var booktitle = entry.fields.get('booktitle');
    if (booktitle)  entry.fields.set('booktitle', shortenFieldJournal(booktitle));
    entry.fields.delete('doi');
    return entry;
  });
  writeFile(out, txt);
}
main(process.argv);




// REFERENCES:
// - https://en.wikipedia.org/wiki/BibTeX
// - https://www.rapidtables.com/code/text/ascii-table.html
// - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference
// - https://www.freecodecamp.org/news/javascript-string-split-example-with-regex/
// - https://stackoverflow.com/questions/2973436/regex-lookahead-lookbehind-and-atomic-groups
// - https://stackoverflow.com/questions/18144868/regex-match-count-of-characters-that-are-separated-by-non-matching-characters
