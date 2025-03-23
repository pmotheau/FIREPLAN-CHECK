const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { app, BrowserWindow } = require('electron');

console.log("Main: src/main.js exécuté - Timestamp:", Date.now());

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    mainWindow.loadFile(path.join(__dirname, 'views/index.html'));
    mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    console.log("Main: Application démarrée");
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.on('convert-ai-to-svg', async (event, { id, arrayBuffer }) => {
    const tempAiPath = path.join(__dirname, `temp-${id}.ai`);
    const tempSvgPath = path.join(__dirname, `temp-${id}.svg`);
    const tempPdfPath = path.join(__dirname, `temp-${id}.pdf`);

    try {
        fs.writeFileSync(tempAiPath, Buffer.from(arrayBuffer));
        console.log("Fichier .ai écrit:", tempAiPath, "Taille:", arrayBuffer.byteLength);

        // Convertir en SVG
        const inkscapePath = '"C:\\Program Files\\Inkscape\\bin\\inkscape.exe"';
        const svgCommand = `${inkscapePath} "${tempAiPath}" --export-type=svg --export-filename="${tempSvgPath}" --export-area-page`;
        exec(svgCommand, (svgError, svgStdout, svgStderr) => {
            if (svgError) {
                console.error("Erreur conversion SVG:", svgError, svgStderr);
                event.sender.send('svg-converted', { id, error: "Erreur de conversion SVG" });
                fs.unlinkSync(tempAiPath);
                return;
            }

            const svgContent = fs.readFileSync(tempSvgPath, 'utf8');
            console.log("SVG généré, taille:", svgContent.length);

            // Convertir en PDF
            const pdfCommand = `${inkscapePath} "${tempAiPath}" --export-type=pdf --export-filename="${tempPdfPath}"`;
            exec(pdfCommand, (pdfError, pdfStdout, pdfStderr) => {
                if (pdfError) {
                    console.error("Erreur conversion PDF:", pdfError, pdfStderr);
                    event.sender.send('svg-converted', { id, svg: svgContent, error: "Erreur de conversion PDF" });
                    fs.unlinkSync(tempAiPath);
                    fs.unlinkSync(tempSvgPath);
                    return;
                }

                const pdfBuffer = fs.readFileSync(tempPdfPath);
                console.log("PDF généré, taille:", pdfBuffer.length);

                // Convertir le Buffer en Uint8Array
                const pdfContent = new Uint8Array(pdfBuffer);
                console.log("pdfContent prêt à envoyer, type:", pdfContent.constructor.name, "taille:", pdfContent.length);

                // Envoyer SVG et PDF au renderer
                event.sender.send('svg-converted', {
                    id,
                    svg: svgContent,
                    pdf: pdfContent // Uint8Array
                });
                console.log("Événement svg-converted envoyé avec id:", id);

                fs.unlinkSync(tempAiPath);
                fs.unlinkSync(tempSvgPath);
                fs.unlinkSync(tempPdfPath);
            });
        });
    } catch (err) {
        console.error("Erreur générale dans convert-ai-to-svg:", err);
        event.sender.send('svg-converted', { id, error: "Erreur lors du traitement du fichier .ai" });
        fs.unlinkSync(tempAiPath);
    }
});