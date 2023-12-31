const fs = require('fs');
const path = require('path');
const readline = require('readline');
const sharp = require('sharp');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path of the folder containing the files to rename
const inputPath = path.resolve(__dirname, '_input');
const params = {
  input_files: [],
  rename: false,
  prefix: '',
  format: false,
  quality: 100,
  metadata: false,
  counter: 1
};

async function main() {
  params.input_files = fs.readdirSync(inputPath);
  if (params.input_files.length === 0 || params.input_files === undefined) { console.error('Error occured while reading directory!', err); return }
  console.log("Files found : " + params.input_files.length + "\n");

  // Ask user for renaming
  let rename = await prompt("Rename files ? (y/n) or leave empty (default: false)\n");
  rename = rename === "y" ? true : false;
  params.rename = rename;
  console.log(rename ? "Files will be renamed" : "Files will not be renamed" + "\n");

  if (rename) {
    // Ask user for filename prefix
    let prefix = await prompt("Enter a prefix or leave empty (ex: 'toto' -> toto-1.png)\n");
    if (prefix === null) { prefix = ''; }
    if (prefix !== '') { console.log("Prefix set to : " + prefix + "\n"); }
    params.prefix = prefix !== '' ? prefix + '-' : '';
  }

  // Ask user for format
  let format = await prompt(`Enter a format or leave empty (png, jpg, webp, tiff, gif, svg, pdf, raw, etc.)\n`);
  if (format === null) { format = ''; }
  if (format !== '') { console.log("Format set to : " + format + "\n"); }
  params.format = format !== '' ? format : false;

  // Ask user for quality
  let quality = await prompt("Enter a quality or leave empty (0-100) (default: 100)\n");
  if (quality === null) { quality = ''; }
  if (quality !== '') { console.log("Quality set to : " + quality + "\n"); }
  params.quality = quality !== '' && !isNaN(quality) ? Number(quality) : 100;

  // If quality is empty, rename files only
  if (quality === "") { treatFiles('rename'); return }

  // Ask user for metadata
  let metadata = await prompt("Preserve metadata ? (y/n) or leave empty (default: false)\n");
  if (metadata === null) { metadata = ''; }
  params.metadata = metadata == 'y' ? true : false;
  const metadata_msg = params.metadata ? "Metadata will be preserved" : "Metadata will be deleted";
  console.log(metadata_msg + "\n");

  treatFiles('convert');
}
main();

function prompt(question) {
  return new Promise((resolve, reject) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function treatFiles(mode = 'rename') {
  const outputPath = path.resolve(__dirname, '_output');
  if (!fs.existsSync(outputPath)) { fs.mkdirSync(outputPath) }

  // Scan all files
  params.input_files.forEach((file) => {
    const filePath = path.join(inputPath, file);
    const fileName = path.basename(filePath);
    // console.log(`File found : ${fileName}`);

    // Verify if it's a file and not a folder
    if (!fs.statSync(filePath).isFile()) { return }

    // Verify if file extension is not ".js" or ".bat" or ".txt"
    if (path.extname(filePath) === '.js' && path.extname(filePath) === '.bat' && path.extname(filePath) === '.txt') { return }

    let newFileName = params.prefix + params.counter.toString() + path.extname(filePath);
    switch (mode) {
      case 'rename':
        const newFilePath = path.join(outputPath, newFileName);
        fs.renameSync(filePath, newFilePath);
        console.log(`The file ${file} has been renamed to ${newFileName}`)
        break;
      case 'convert':
        newFileName = params.rename ? params.prefix + params.counter.toString() + '.' + params.format : fileName.split('.')[0] + '.' + params.format;
        convertTo(filePath, path.join(outputPath, newFileName), params.quality, params.metadata);
        console.log(`The file ${file} has been converted to ${newFileName}`)
        break;
      default:
        break;
    }

    params.counter++;
  });

  if (mode !== 'rename') { 
    // Ask user for delete input files
    prompt("Delete input files ? (y/n) or leave empty (default: false)").then((answer) => {
      if (answer === 'y') {
        params.input_files.forEach((file) => {
          const filePath = path.join(inputPath, file);
          fs.unlinkSync(filePath);
        });
        console.log("Done !");
      }
      rl.close();
    });
  }
}

const convertTo = async (inputPath, outputPath, quality = 100, preserve_metadata = false) => {
  const format = path.extname(outputPath).replace('.', '');
  try {
    await sharp(inputPath)
      .toFormat(format, { quality: quality })
      .withMetadata(preserve_metadata) // Delete metadata
      .toFile(outputPath);
    return true;
  } catch (error) {
    console.error('Error occured while converting file!', error);
    return false;
  }
};