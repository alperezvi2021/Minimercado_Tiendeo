const fs = require('fs');
const pdf = require('pdf-parse');

async function readPdf(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const parseFunc = typeof pdf === 'function' ? pdf : pdf.default;
        const data = await parseFunc(dataBuffer);
        console.log(`\n\n=== CONTENT OF ${filePath} ===\n`);
        console.log(data.text);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message, error.stack);
    }
}

async function main() {
    await readPdf('arquitectura_pro.pdf');
    await readPdf('enfoque_pro.pdf');
}

main();
