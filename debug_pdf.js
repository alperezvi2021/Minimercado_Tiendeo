const fs = require('fs');
const pdf = require('pdf-parse');

async function main() {
    console.log('Type of pdf:', typeof pdf);
    console.log('Keys of pdf:', Object.keys(pdf));
    
    const dataBuffer = fs.readFileSync('arquitectura_pro.pdf');
    try {
        const data = await pdf(dataBuffer);
        console.log('Content Header:', data.text.substring(0, 500));
    } catch (e) {
        console.log('Error with direct call:', e.message);
        try {
            const data = await pdf.default(dataBuffer);
            console.log('Content Header with .default:', data.text.substring(0, 500));
        } catch (e2) {
            console.log('Error with .default call:', e2.message);
        }
    }
}
main();
