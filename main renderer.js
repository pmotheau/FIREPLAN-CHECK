document.addEventListener('DOMContentLoaded', function () {
    const uploadSection = document.getElementById('upload-section');
    const analysisSection = document.getElementById('analysis-section');
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const uploadIcon = uploadZone.querySelector('img');
    const uploadText = uploadZone.querySelectorAll('p');
    const analyzeButton = document.getElementById('analyze-button');
    const headerDescription = document.querySelector('header p');
    const navButtons = document.querySelectorAll('nav button');
    const analysisContent = document.getElementById('analysis-content');
    const fullscreenPreview = document.getElementById('fullscreen-preview');
    const fullscreenCanvas = document.getElementById('fullscreen-canvas');
    const newAnalysisButton = document.getElementById('new-analysis-button');
    const addFileButton = document.getElementById('add-file-button');
    const logoContainer = document.querySelector('.logo-title-container');
    const popup = document.getElementById('confirmation-popup');
    const confirmYes = document.getElementById('confirm-yes');
    const confirmCancel = document.getElementById('confirm-cancel');
    const analysisResults = new Map(); // Assure-toi que ceci est présent !

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

    // Initialisation des événements
    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (event) => handleFiles(event.target.files));
    uploadZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (event) => {
        event.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFiles(event.dataTransfer.files);
    });

    analyzeButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (headerDescription) headerDescription.style.display = 'none';
        navButtons.forEach(button => button.style.display = 'none');
        uploadSection.style.display = 'none';
        analysisSection.style.display = 'block';
        generateAnalysisBlocks();
    });

    newAnalysisButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        showConfirmationPopup('new-analysis');
    });

    addFileButton.addEventListener('click', generateAnalysisReport);

    logoContainer.addEventListener('click', function(e) {
        if (isOnImportedFilesPage()) {
            e.preventDefault();
            showConfirmationPopup('logo');
        } else {
            window.location.href = 'index.html';
        }
    });

    confirmYes.addEventListener('click', () => window.location.href = 'index.html');
    confirmCancel.addEventListener('click', closePopup);
    popup.addEventListener('click', (e) => {
        if (e.target === popup) closePopup();
    });

    fullscreenCanvas.addEventListener('click', () => fullscreenPreview.style.display = 'none');

    preloadAllIcons();

    // Ajouter l'écouteur pour 'convert-ai-to-svg' ici
    window.addEventListener('convert-ai-to-svg', (event) => {
        console.log("Renderer: Événement convert-ai-to-svg capturé dans le renderer:", event.detail);
    });

    function handleFiles(files) {
        uploadIcon.classList.add('small-icon');
        uploadText.forEach(p => p.style.display = 'none');
        const existingFiles = Array.from(fileList.getElementsByClassName('file-name')).map(span => span.textContent);

        for (const file of files) {
            if (existingFiles.includes(file.name)) {
                alert(`Le fichier "${file.name}" a déjà été importé.`);
                continue;
            }

            const fileItem = document.createElement('div');
            fileItem.classList.add('file-item');
            fileItem.file = file;

            const fileIcon = document.createElement('img');
            fileIcon.src = '../assets/icons/file-icon.svg';
            fileIcon.alt = 'File Icon';

            const fileName = document.createElement('span');
            fileName.textContent = file.name;
            fileName.classList.add('file-name');

            const fileSize = document.createElement('span');
            fileSize.textContent = `${(file.size / 1024).toFixed(1)} Ko`;
            fileSize.classList.add('file-size');

            const removeIcon = document.createElement('img');
            removeIcon.src = '../assets/icons/remove-icon.svg';
            removeIcon.alt = 'Remove Icon';
            removeIcon.classList.add('remove-icon');
            removeIcon.addEventListener('click', (event) => {
                event.stopPropagation();
                fileItem.remove();
                if (!fileList.hasChildNodes()) {
                    uploadIcon.classList.remove('small-icon');
                    uploadText.forEach(p => p.style.display = 'block');
                    analyzeButton.style.display = 'none';
                }
                updateBlocksCounter();
            });

            fileItem.appendChild(fileIcon);
            fileItem.appendChild(fileName);
            fileItem.appendChild(fileSize);
            fileItem.appendChild(removeIcon);
            fileList.appendChild(fileItem);
        }

        if (fileList.hasChildNodes()) analyzeButton.style.display = 'block';
    }

    function generateAnalysisBlocks() {
        const importedFiles = Array.from(fileList.getElementsByClassName('file-item'));
        const iconDetails = [
            { id: 1, name: "Picto(s) mal orienté(s)", file: "errorpicto-icon.svg", type: "picto" },
            { id: 2, name: "Picto(s) PI présent(s)", file: "pictopi-icon.svg", type: "picto" },
            { id: 3, name: "Picto(s) PE présent(s)", file: "pictope-icon.svg", type: "picto" },
            { id: 4, name: "Issue(s) d'évacuation mal orientée(s)", file: "evacuation-icon.svg", type: "evac" },
            { id: 5, name: "VEI mal orienté(s)", file: "veierror-icon.svg", type: "vei" },
            { id: 6, name: "Point de Rassemblement manquant", file: "pdr-icon.svg" },
            { id: 7, name: "Orthographe", file: "orthographe-icon.svg" },
            { id: 8, name: "Légende pas à jour", file: "legende-icon.svg" },
            { id: 9, name: "Maquette affichée", file: "maquette-icon.svg" }
        ];

        analysisContent.innerHTML = '';
        importedFiles.forEach(fileItem => {
            const fileName = fileItem.querySelector('.file-name').textContent;
            const analysisBlock = document.createElement('div');
            analysisBlock.classList.add('analysis-block');

            const fileHeader = document.createElement('div');
            fileHeader.classList.add('file-header');
            fileHeader.innerHTML = `
                <div class="toggle-container">
                    <button class="toggle-button expand-collapse-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <span class="file-name">${fileName}</span>
                <span class="points-checks-valides">0/4 checks vérifiés</span>
                <span class="conformity-status">Non conforme</span>
            `;

            const contentBlock = document.createElement('div');
            contentBlock.classList.add('content-block');
            const detailsBlock = document.createElement('div');
            detailsBlock.classList.add('details-block');

            detailsBlock.innerHTML = `
                <div class="details-item">
                    <div class="details-content-wrapper">
                        <img src="../assets/icons/error-icon.svg" alt="Error Icon" class="check-icon">
                        <div class="details-content-block">
                            <h3><img src="../assets/icons/dimensions-icon.svg" alt="Dimensions Icon"> Dimensions du plan :</h3>
                            <div class="details-content">
                                <p><strong>Format:</strong> <span class="format-value">A2</span></p>
                                <p><strong>Orientation:</strong> <span class="orientation-value">Horizontal (Paysage)</span></p>
                                <p><strong>Dimensions:</strong> <span class="dimensions-value">1191,0 x 842,00 mm</span></p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="details-item">
                    <div class="details-content-wrapper">
                        <img src="../assets/icons/error-icon.svg" alt="Error Icon" class="check-icon">
                        <div class="details-content-block">
                            <h3><img src="../assets/icons/address-icon.svg" alt="Address Icon"> Vérification du nom du site et de l'adresse :</h3>
                            <div class="details-content">
                                <p><strong>Nom du site détecté:</strong> <span class="site-name-value">Non détecté</span></p>
                                <p><strong>Adresse du site détectée:</strong> <span class="site-address-value">Non détectée</span></p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="details-item">
                    <div class="details-content-wrapper">
                        <img src="../assets/icons/error-icon.svg" alt="Error Icon" class="check-icon">
                        <div class="details-content-block">
                            <h3><img src="../assets/icons/vei-icon.svg" alt="VEI Icon"> Vérification des groupes VEI :</h3>
                            <div class="details-content">
                                <p><strong>Nombre de pastilles détectées:</strong> 0</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const previewBlock = document.createElement('div');
            previewBlock.classList.add('preview-block');
            const previewContainer = document.createElement('div');
            previewContainer.classList.add('preview-container');
            const previewSplitContainer = document.createElement('div');
            previewSplitContainer.classList.add('preview-split-container');

            const previewLeftZone = document.createElement('div');
            previewLeftZone.classList.add('preview-left-zone');
            const leftZoneHeader = document.createElement('div');
            leftZoneHeader.classList.add('zone-header');
            const statusIcon = document.createElement('img');
            statusIcon.src = "../assets/icons/ok-icon.svg";
            statusIcon.alt = "Status Icon";
            statusIcon.classList.add('status-icon', 'check-icon');
            const leftZoneTitle = document.createElement('h3');
            leftZoneTitle.textContent = "Aperçu du plan";
            leftZoneHeader.appendChild(statusIcon);
            leftZoneHeader.appendChild(leftZoneTitle);
            const canvas = document.createElement('canvas');
            canvas.classList.add('plan-preview-canvas');
            previewLeftZone.appendChild(leftZoneHeader);
            previewLeftZone.appendChild(canvas);

            const previewRightZone = document.createElement('div');
            previewRightZone.classList.add('preview-right-zone');
            const rightZoneHeader = document.createElement('div');
            rightZoneHeader.classList.add('zone-header');
            const rightZoneTitle = document.createElement('h3');
            rightZoneTitle.textContent = "Erreur(s) relevée(s)";
            rightZoneHeader.appendChild(rightZoneTitle);
            previewRightZone.appendChild(rightZoneHeader);

            const errorsContent = document.createElement('div');
            errorsContent.classList.add('errors-content');
            for (let row = 0; row < 3; row++) {
                const iconRow = document.createElement('div');
                iconRow.classList.add('icon-row');
                for (let col = 0; col < 3; col++) {
                    const iconIndex = row * 3 + col;
                    const iconData = iconDetails[iconIndex];
                    const iconContainer = document.createElement('div');
                    iconContainer.classList.add('icon-container');
                    const iconNumber = document.createElement('span');
                    iconNumber.classList.add('icon-number', 'hidden');
                    iconNumber.textContent = iconData.id;
                    const clickableIcon = document.createElement('div');
                    clickableIcon.classList.add('clickable-icon');
                    clickableIcon.setAttribute('data-icon-id', iconData.id);
                    clickableIcon.setAttribute('data-icon-name', iconData.name);
                    clickableIcon.setAttribute('data-icon-type', iconData.type || '');
                    const iconImage = document.createElement('img');
                    iconImage.src = `../assets/icons/${iconData.file}`;
                    iconImage.alt = `Icône ${iconData.id}`;
                    clickableIcon.appendChild(iconImage);
                    iconContainer.appendChild(iconNumber);
                    iconContainer.appendChild(clickableIcon);
                    iconRow.appendChild(iconContainer);
                }
                errorsContent.appendChild(iconRow);
            }
            previewRightZone.appendChild(errorsContent);

            previewSplitContainer.appendChild(previewLeftZone);
            previewSplitContainer.appendChild(previewRightZone);

            const editableTextBlock = document.createElement('div');
            editableTextBlock.classList.add('editable-text-block');
            const textArea = document.createElement('div');
            textArea.classList.add('editable-text-area');
            textArea.setAttribute('contenteditable', 'true');
            textArea.setAttribute('placeholder', 'Ajoutez vos commentaires ici...');
            const buttonsContainer = document.createElement('div');
            buttonsContainer.classList.add('text-block-buttons');
            const saveButton = document.createElement('button');
            saveButton.classList.add('text-block-button', 'save-button');
            saveButton.textContent = 'Enregistrer';
            const cancelButton = document.createElement('button');
            cancelButton.classList.add('text-block-button', 'cancel-button');
            cancelButton.textContent = 'Annuler';
            buttonsContainer.appendChild(saveButton);
            buttonsContainer.appendChild(cancelButton);
            editableTextBlock.appendChild(textArea);
            editableTextBlock.appendChild(buttonsContainer);

            previewContainer.appendChild(previewSplitContainer);
            previewContainer.appendChild(editableTextBlock);
            previewBlock.appendChild(previewContainer);
            

            contentBlock.appendChild(detailsBlock);
            contentBlock.appendChild(previewBlock);
            analysisBlock.appendChild(fileHeader);
            analysisBlock.appendChild(contentBlock);
            analysisContent.appendChild(analysisBlock);

            canvas.addEventListener('click', () => displayFullscreen(fileItem.file));
            displayPreviewAndAnalyze(fileItem.file, canvas, analysisBlock);

            saveButton.addEventListener('click', () => {
                console.log('Commentaire enregistré :', textArea.innerText);
                updateStatusIcon(analysisBlock);
                showSavedMessage(editableTextBlock);
            });

            cancelButton.addEventListener('click', () => {
                textArea.innerText = '';
                updateStatusIcon(analysisBlock);
            });

            const clickableIcons = previewRightZone.querySelectorAll('.clickable-icon');
            clickableIcons.forEach(icon => {
                icon.addEventListener('click', function() {
                    const iconId = this.getAttribute('data-icon-id');
                    const iconName = this.getAttribute('data-icon-name');
                    if (this.classList.contains('active')) {
                        this.classList.remove('active');
                        textArea.innerText = textArea.innerText.replace(iconName + '\n', '');
                    } else {
                        this.classList.add('active');
                        textArea.innerText += (textArea.innerText && !textArea.innerText.endsWith('\n') ? '\n' : '') + iconName + '\n';
                    }
                    updateStatusIcon(analysisBlock);
                });
            });

            const toggleButton = analysisBlock.querySelector('.expand-collapse-btn');
            const fileHeaderElement = analysisBlock.querySelector('.file-header');
            function toggleBlockState() {
                analysisBlock.classList.toggle('collapsed');
                toggleButton.setAttribute('aria-expanded', !analysisBlock.classList.contains('collapsed'));
            }
            toggleButton.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleBlockState();
            });
            fileHeaderElement.addEventListener('click', (e) => {
                if (!e.target.closest('.conformity-status')) toggleBlockState();
            });

            textArea.addEventListener('input', () => updateStatusIcon(analysisBlock));

            const checkIcons = detailsBlock.querySelectorAll('.check-icon');
            checkIcons.forEach(icon => {
                icon.addEventListener('dblclick', function() {
                    this.src = this.src.includes('error-icon.svg') ? "../assets/icons/ok-icon.svg" : "../assets/icons/error-icon.svg";
                    this.alt = this.src.includes('ok-icon.svg') ? "Ok Icon" : "Error Icon";
                    updatePointsChecks(analysisBlock);
                    updateGlobalConformity();
                    this.style.opacity = "0.5";
                    setTimeout(() => this.style.opacity = "", 200);
                });
                icon.style.cursor = "pointer";
                icon.setAttribute('title', 'Double-cliquez pour changer le statut');
            });

            statusIcon.addEventListener('dblclick', function() {
                this.src = this.src.includes('error-icon.svg') ? "../assets/icons/ok-icon.svg" : "../assets/icons/error-icon.svg";
                this.alt = this.src.includes('ok-icon.svg') ? "Ok Icon" : "Error Icon";
                updatePointsChecks(analysisBlock);
                updateGlobalConformity();
                this.style.opacity = "0.5";
                setTimeout(() => this.style.opacity = "", 200);
            });
            statusIcon.style.cursor = "pointer";
            statusIcon.setAttribute('title', 'Double-cliquez pour changer le statut');
        });
        updateBlocksCounter();
    }

    function updatePointsChecks(analysisBlock) {
        const checkIcons = analysisBlock.querySelectorAll('.details-content-wrapper .check-icon, .status-icon');
        const validChecks = Array.from(checkIcons).filter(icon => icon.src.includes('ok-icon.svg')).length;
        const pointsChecksText = `${validChecks}/4 checks vérifiés`;
        analysisBlock.querySelector('.points-checks-valides').textContent = pointsChecksText;

        const conformityStatus = analysisBlock.querySelector('.conformity-status');
        conformityStatus.textContent = validChecks === 4 ? "Conforme" : "Non conforme";
        conformityStatus.style.backgroundColor = validChecks === 4 ? "rgb(73, 158, 68)" : "red";
    }

    function updateGlobalConformity() {
        const analysisBlocks = document.querySelectorAll('.analysis-block');
        const globalConformityStatus = document.querySelector('.global-conformity-status');
        const totalBlocks = analysisBlocks.length;
        if (!globalConformityStatus || totalBlocks === 0) return;

        const conformFiles = Array.from(analysisBlocks).filter(block => 
            block.querySelector('.conformity-status').textContent === "Conforme"
        ).length;

        globalConformityStatus.textContent = conformFiles === totalBlocks ? "Conforme" : "Non conforme";
        globalConformityStatus.className = `global-conformity-status ${conformFiles === totalBlocks ? 'conforme' : 'non-conforme'}`;
        updateBlocksCounter();
    }

    function updateBlocksCounter() {
        const fileCount = fileList.querySelectorAll('.file-item').length;
        const blocksCounter = document.querySelector('.blocks-counter');
        if (blocksCounter) {
            const analysisBlocks = document.querySelectorAll('.analysis-block');
            const conformFiles = Array.from(analysisBlocks).filter(block => 
                block.querySelector('.conformity-status').textContent === "Conforme"
            ).length;
            const blocText = fileCount > 1 ? "blocs" : "bloc";
            blocksCounter.textContent = fileCount > 0 
                ? `${conformFiles}/${fileCount} ${blocText} vérifié${fileCount > 1 ? 's' : ''}`
                : "0/0 bloc vérifié";
        }
    }
    async function analyzeSVGContent(svgContent) {
        return new Promise((resolve, reject) => {
            try {
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
                const errorElement = svgDoc.querySelector('parsererror');
                if (errorElement) {
                    throw new Error("Erreur lors du parsing du SVG");
                }
    
                // Extraction des dimensions, format et orientation
                const dimensionsData = extractSVGDimensions(svgDoc);
    
                // Traitement existant pour le calque VEI
                const veiLayer = Array.from(svgDoc.getElementsByTagName('g')).find(g => 
                    g.getAttribute('inkscape:label')?.toUpperCase().trim() === 'VEI'
                );
                let veiGroupCount = 0;
                if (veiLayer) {
                    const textElements = veiLayer.getElementsByTagName('text');
                    for (const text of textElements) {
                        const tspans = text.getElementsByTagName('tspan');
                        let combinedText = '';
                        if (tspans.length > 0) {
                            combinedText = Array.from(tspans)
                                .map(tspan => tspan.textContent || '')
                                .join('')
                                .toUpperCase()
                                .trim();
                        } else {
                            combinedText = (text.textContent || '').toUpperCase().trim();
                        }
                        if (combinedText.includes('VOUS') && combinedText.includes('ETES') && combinedText.includes('ICI')) {
                            veiGroupCount++;
                        }
                    }
                }
    
                // Extraction du calque TITRE
                const titreLayer = Array.from(svgDoc.getElementsByTagName('g')).find(g => 
                    g.getAttribute('inkscape:label')?.toUpperCase().trim() === 'TITRE'
                );
                let nomDuSite = 'Non détecté';
                let adresseDuSite = 'Non détecté';
    
                if (titreLayer) {
                    const textElements = titreLayer.getElementsByTagName('text');
                    if (textElements.length >= 1) {
                        const firstText = textElements[0];
                        const tspans = firstText.getElementsByTagName('tspan');
                        if (tspans.length > 0) {
                            nomDuSite = Array.from(tspans)
                                .map(tspan => tspan.textContent || '')
                                .join('')
                                .trim();
                        } else {
                            nomDuSite = (firstText.textContent || '').trim();
                        }
                    }
                    if (textElements.length >= 2) {
                        const secondText = textElements[1];
                        const tspans = secondText.getElementsByTagName('tspan');
                        if (tspans.length > 0) {
                            adresseDuSite = Array.from(tspans)
                                .map(tspan => tspan.textContent || '')
                                .join(' ')
                                .trim();
                        } else {
                            adresseDuSite = (secondText.textContent || '').trim();
                        }
                    }
                }
    
                console.log("Nom du site détecté:", nomDuSite);
                console.log("Adresse du site détectée:", adresseDuSite);
                console.log("Nombre total de groupes VEI:", veiGroupCount);
                console.log("Dimensions:", dimensionsData);
    
                resolve({
                    veiCount: veiGroupCount,
                    nomDuSite,
                    adresseDuSite,
                    format: dimensionsData.format,
                    orientation: dimensionsData.orientation,
                    dimensions: dimensionsData.dimensions
                });
            } catch (err) {
                console.error("Erreur dans analyzeSVGContent:", err);
                reject(err);
            }
        });
    }

    async function analyzeFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    if (file.name.endsWith('.svg')) {
                        const result = await analyzeSVGContent(e.target.result);
                        resolve(result);
                    } else if (file.name.endsWith('.ai')) {
                        // Approximation pour .ai sans conversion réelle
                        console.warn("Conversion .ai en SVG non disponible côté client. Utilisation d’un fallback.");
                        resolve({ veiCount: extractVEICountFromFileName(file.name) || 1, nomDuSite: 'Non détecté', adresse: 'Non détectée' });
                    } else if (file.name.endsWith('.pdf')) {
                        const pdfData = new Uint8Array(e.target.result);
                        const pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
                        const page = await pdfDoc.getPage(1);
                        const textContent = await page.getTextContent();
                        const text = textContent.items.map(item => item.str).join(' ').toUpperCase();
                        const veiCount = (text.match(/VOUS ETES ICI/g) || []).length;
                        resolve({ veiCount: veiCount || 1, nomDuSite: '', adresse: '' });
                    } else {
                        resolve({ veiCount: 0, nomDuSite: '', adresse: '' });
                    }
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error("Erreur lors de la lecture du fichier"));
            reader.readAsArrayBuffer(file);
        });
    }

    function displayPreviewAndAnalyze(file, canvas, analysisBlock) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            if (file.name.endsWith('.ai')) {
                const id = Date.now();
                console.log("Envoi de convert-ai-to-svg avec ID:", id, "Taille arrayBuffer:", arrayBuffer.byteLength);
                window.dispatchEvent(new CustomEvent('convert-ai-to-svg', {
                    detail: { id, arrayBuffer }
                }));
    
                // Ajouter un écouteur spécifique à cet ID
                const handler = (event) => {
                    const response = event.detail;
                    console.log("Réception de svg-converted-response:", response);
                    if (response.id === id) {
                        if (response.error) {
                            console.error("Erreur de conversion:", response.error);
                            alert(response.error);
                            analysisBlock.innerHTML = `<p>Erreur: ${response.error}</p>`;
                        } else {
                            const svgContent = response.svg;
                            console.log("SVG reçu:", svgContent.substring(0, 500));
                            analysisResults.set(id, { svgContent, veiCount: 0 });
                            handleSVG(svgContent, canvas, analysisBlock, id);
                        }
                        window.removeEventListener('svg-converted-response', handler);
                    }
                };
                window.addEventListener('svg-converted-response', handler);
            } else if (file.type === 'application/pdf') {
                // Gestion existante pour les PDF
            } else if (file.type === 'image/svg+xml') {
                const svgContent = new TextDecoder().decode(arrayBuffer);
                console.log("SVG direct importé:", svgContent.substring(0, 500));
                const id = Date.now();
                analysisResults.set(id, { svgContent, veiCount: 0 });
                handleSVG(svgContent, canvas, analysisBlock, id);
            }
        };
        reader.readAsArrayBuffer(file);
    }
    function extractSVGDimensions(svgDoc) {
        let width = 0;
        let height = 0;
    
        // Ciblage spécifique du clipPath avec id="clipPath83"
        const clipPath = svgDoc.querySelector('#clipPath83 path');
        if (clipPath) {
            const d = clipPath.getAttribute('d');
            console.log("Valeur complète de d dans clipPath83:", d);
    
            // Extraction de la largeur (H suivi d'un nombre)
            const widthMatch = d.match(/H\s*(\d+(\.\d+)?)/i);
            if (widthMatch) {
                width = parseFloat(widthMatch[1]);
                console.log("Largeur extraite (width):", width);
            } else {
                console.log("Aucune largeur trouvée avec H dans d");
            }
    
            // Extraction de la hauteur (nombre après M 0,)
            const heightMatch = d.match(/M\s*0,(\d+(\.\d+)?)/i);
            if (heightMatch) {
                height = parseFloat(heightMatch[1]);
                console.log("Hauteur extraite (height):", height);
            } else {
                console.log("Aucune hauteur trouvée avec M 0, dans d");
            }
        } else {
            console.log("Aucun clipPath avec id='clipPath83' trouvé dans le SVG");
        }
    
        // Vérification des valeurs extraites
        if (width === 0 || height === 0) {
            console.log("Dimensions non détectées correctement dans clipPath83:", { width, height });
        }
    
        // Conversion en mm
        const widthMm = pointsToMm(width);
        const heightMm = pointsToMm(height);
    
        // Déterminer le format
        const format = getPaperSize(widthMm, heightMm);
    
        // Déterminer l'orientation
        const orientation = widthMm > heightMm ? "Paysage" : "Portrait";
    
        const result = {
            format,
            orientation,
            dimensions: `${widthMm.toFixed(1)} × ${heightMm.toFixed(1)} mm`,
            width: widthMm,
            height: heightMm
        };
        console.log("Résultat final des dimensions:", result);
        return result;
    }
    
    // Fonctions utilitaires (déjà dans votre code)
    function pointsToMm(points) {
        return points * 25.4 / 72;
    }
    
    function getPaperSize(width_mm, height_mm) {
        const sizes = {
            "A0": [841, 1189],
            "A1": [594, 841],
            "A2": [420, 594],
            "A3": [297, 420],
            "A4": [210, 297]
        };
        for (const [size, [w, h]] of Object.entries(sizes)) {
            if (Math.abs(width_mm - w) < 5 && Math.abs(height_mm - h) < 5) return `${size} Portrait`;
            if (Math.abs(width_mm - h) < 5 && Math.abs(height_mm - w) < 5) return `${size} Paysage`;
        }
        return "Format inconnu";
    }

    async function handleSVG(svgContent, canvas, analysisBlock, id) {
        try {
            const analysisData = await analyzeSVGContent(svgContent);
            const veiCount = analysisData.veiCount;
            const nomDuSite = analysisData.nomDuSite;
            const adresseDuSite = analysisData.adresseDuSite;
            const format = analysisData.format;
            const orientation = analysisData.orientation;
            const dimensions = analysisData.dimensions;
    
            // Mettre à jour les résultats stockés
            analysisResults.set(id, { svgContent, veiCount, nomDuSite, adresseDuSite, format, orientation, dimensions });
    
            // Mise à jour des dimensions, format et orientation
            const formatSpan = analysisBlock.querySelector('.details-item:nth-child(1) .format-value');
            if (formatSpan) formatSpan.textContent = format;
    
            const orientationSpan = analysisBlock.querySelector('.details-item:nth-child(1) .orientation-value');
            if (orientationSpan) orientationSpan.textContent = orientation;
    
            const dimensionsSpan = analysisBlock.querySelector('.details-item:nth-child(1) .dimensions-value');
            if (dimensionsSpan) dimensionsSpan.textContent = dimensions;
    
            const dimensionsCheckIcon = analysisBlock.querySelector('.details-item:nth-child(1) .check-icon');
            if (dimensionsCheckIcon) {
                dimensionsCheckIcon.src = format !== "Format inconnu" ? "../assets/icons/ok-icon.svg" : "../assets/icons/error-icon.svg";
                dimensionsCheckIcon.alt = format !== "Format inconnu" ? "Ok Icon" : "Error Icon";
            }
    
            // Mise à jour du nom du site et de l’adresse
            const siteNameSpan = analysisBlock.querySelector('.details-item:nth-child(2) .site-name-value');
            if (siteNameSpan) siteNameSpan.textContent = nomDuSite;
    
            const siteAddressSpan = analysisBlock.querySelector('.details-item:nth-child(2) .site-address-value');
            if (siteAddressSpan) siteAddressSpan.textContent = adresseDuSite;
    
            const apiCheckSpan = document.createElement('p');
            apiCheckSpan.innerHTML = `<strong>Check API Google:</strong> <span class="api-check-value">Vérification en cours...</span>`;
            const detailsContent = analysisBlock.querySelector('.details-item:nth-child(2) .details-content');
            detailsContent.appendChild(apiCheckSpan);
    
            const siteCheckIcon = analysisBlock.querySelector('.details-item:nth-child(2) .check-icon');
            const apiCheckValue = apiCheckSpan.querySelector('.api-check-value');
            if (adresseDuSite !== 'Non détecté') {
                const isValid = await verifyAddressWithGoogle(adresseDuSite);
                if (isValid) {
                    apiCheckValue.textContent = "Adresse valide";
                    apiCheckValue.style.color = "green";
                    siteCheckIcon.src = "../assets/icons/ok-icon.svg";
                    siteCheckIcon.alt = "Ok Icon";
                } else {
                    apiCheckValue.textContent = "Adresse invalide";
                    apiCheckValue.style.color = "red";
                    siteCheckIcon.src = "../assets/icons/error-icon.svg";
                    siteCheckIcon.alt = "Error Icon";
                }
            } else {
                apiCheckValue.textContent = "Adresse non détectée";
                apiCheckValue.style.color = "red";
                siteCheckIcon.src = "../assets/icons/error-icon.svg";
                siteCheckIcon.alt = "Error Icon";
            }
    
            // Mise à jour VEI
            const veiDetails = analysisBlock.querySelector('.details-item:nth-child(3) .details-content p');
            if (veiDetails) {
                veiDetails.innerHTML = `<strong>Nombre de pastilles détectées:</strong> ${veiCount}`;
            }
            const veiCheckIcon = analysisBlock.querySelector('.details-item:nth-child(3) .check-icon');
            if (veiCheckIcon) {
                veiCheckIcon.src = veiCount > 0 ? "../assets/icons/ok-icon.svg" : "../assets/icons/error-icon.svg";
                veiCheckIcon.alt = veiCount > 0 ? "Ok Icon" : "Error Icon";
            }
    
            // Affichage de l'aperçu SVG
            const svgDataURL = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));
            const img = new Image();
            img.src = svgDataURL;
            img.onload = () => {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
            };
    
            updatePointsChecks(analysisBlock);
            updateGlobalConformity();
        } catch (err) {
            console.error('Erreur lors de l’analyse du SVG:', err);
            analysisBlock.innerHTML = `<p>Erreur lors de l’analyse: ${err.message}</p>`;
        }
    }

        
    async function verifyAddressWithGoogle(address) {
        const GOOGLE_API_KEY = "VOTRE_CLE_API"; // Remplacez par votre clé API Google
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
    
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.status === "OK") {
                return { isValid: true, formattedAddress: data.results[0].formatted_address };
            } else if (data.status === "ZERO_RESULTS") {
                return { isValid: false, suggestion: null };
            } else if (data.results && data.results.length > 0) {
                return { isValid: false, suggestion: data.results[0].formatted_address };
            } else {
                return { isValid: false, suggestion: null };
            }
        } catch (error) {
            console.error("Erreur lors de la vérification de l'adresse:", error);
            return { isValid: false, suggestion: null };
        }
    }
    async function displayFullscreen(file) {
        const fileReader = new FileReader();
        fileReader.onload = async function() {
            const arrayBuffer = this.result;
            let pdfData = arrayBuffer;

            if (file.name.endsWith('.ai')) {
                pdfData = await convertAiToPdf(arrayBuffer);
            }

            try {
                const pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
                const page = await pdfDoc.getPage(1);
                const viewport = page.getViewport({ scale: 1 });
                const context = fullscreenCanvas.getContext('2d');
                const scale = Math.min(window.innerWidth / viewport.width, window.innerHeight / viewport.height);
                fullscreenCanvas.width = viewport.width * scale;
                fullscreenCanvas.height = viewport.height * scale;
                const scaledViewport = page.getViewport({ scale });
                await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
                fullscreenPreview.style.display = 'flex';
            } catch (error) {
                console.error('Erreur lors de l\'affichage en plein écran :', error);
            }
        };
        fileReader.readAsArrayBuffer(file);
    }

    async function convertAiToPdf(arrayBuffer) {
        return arrayBuffer; // Simulation
    }


    function preloadAllIcons() {
        const iconNames = [
            'address-icon', 'alert-red', 'check-green', 'dimensions-icon', 'error-icon', 'errorpicto-icon',
            'evacuation-icon', 'favicon', 'file-icon', 'legende-icon', 'maquette-icon', 'ok-icon',
            'orthographe-icon', 'pdr-icon', 'pictope-icon', 'pictopi-icon', 'remove-icon', 'sai-logo',
            'shield-red', 'upload-pink', 'vei-check', 'veierror-icon', 'vei-icon'
        ];
        const loadPromises = iconNames.map(iconName => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = resolve;
                img.onerror = resolve;
                img.src = `../assets/icons/${iconName}.svg`;
            });
        });
        Promise.all(loadPromises).then(() => console.log('Icônes préchargées'));
    }

    function generateAnalysisReport() {
        const currentDate = '2025-03-20 12:00:00'; // Date actuelle
        const currentUser = 'pmotheau';
    
        const loadingIndicator = document.createElement('div');
        loadingIndicator.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background-color: rgba(0, 0, 0, 0.7); z-index: 9999; 
            display: flex; justify-content: center; align-items: center; 
            color: white; font-size: 20px;
        `;
        loadingIndicator.innerHTML = 'Génération du PDF en cours...';
        document.body.appendChild(loadingIndicator);
    
        try {
            const collapsedBlocks = Array.from(document.querySelectorAll('.analysis-block.collapsed'));
            collapsedBlocks.forEach(block => block.classList.remove('collapsed'));
    
            const analysisBlocks = document.querySelectorAll('.analysis-block');
            const globalConformity = document.querySelector('.global-conformity-status')?.textContent || '';
            const blocksCounter = document.querySelector('.blocks-counter')?.textContent || '';
            const fileName = document.querySelector('.file-item .file-name')?.textContent.slice(0, 25) || 'rapport';
    
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - (2 * margin);
            let yPosition = margin;
    
            doc.setProperties({
                title: `Compte rendu - ${fileName}`,
                author: currentUser,
                subject: 'Rapport de vérification FirePlan Checker',
                keywords: 'FirePlan, sécurité incendie',
                creator: 'FirePlan Checker Application'
            });
    
            function checkNewPage(requiredHeight) {
                if (yPosition + requiredHeight > pageHeight - margin) {
                    doc.addPage();
                    yPosition = margin;
                    return true;
                }
                return false;
            }
    
            // Étape 1 : Générer la page "Résumé de l'Analyse" en premier
            // Calculer les statistiques
            const totalBlocks = analysisBlocks.length;
            const conformeBlocks = Array.from(analysisBlocks).filter(block => 
                block.querySelector('.conformity-status')?.textContent === "Conforme"
            ).length;
            const nonConformeBlocks = totalBlocks - conformeBlocks;
    
            // Page de résumé
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor(211, 47, 47);
            doc.text("Service qualité SAI", pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 8;
            doc.setFontSize(12);
            doc.setTextColor(80, 80, 80);
            doc.text("Résumé de l'Analyse", pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 10;
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(`Date: ${currentDate} UTC`, margin, yPosition);
            doc.text(`Utilisateur: ${currentUser}`, pageWidth - margin, yPosition, { align: 'right' });
            yPosition += 20;
    
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(50, 50, 50);
            doc.text("Statistiques de l'analyse", margin, yPosition);
            yPosition += 5;
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(margin, yPosition, contentWidth, 35, 3, 3, 'F');
            yPosition += 10;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.text(`Nombre total de plans analysés:`, margin + 10, yPosition);
            doc.text(`${totalBlocks}`, margin + 100, yPosition);
            yPosition += 8;
            doc.setTextColor(73, 158, 68);
            doc.text(`Plans conformes:`, margin + 10, yPosition);
            doc.text(`${conformeBlocks}`, margin + 100, yPosition);
            if (totalBlocks > 0) {
                const conformeWidth = (conformeBlocks / totalBlocks) * 70;
                doc.setFillColor(73, 158, 68);
                doc.roundedRect(margin + 105, yPosition - 3, conformeWidth, 4, 2, 2, 'F');
            }
            yPosition += 8;
            doc.setTextColor(211, 47, 47);
            doc.text(`Plans non conformes:`, margin + 10, yPosition);
            doc.text(`${nonConformeBlocks}`, margin + 100, yPosition);
            if (totalBlocks > 0) {
                const nonConformeWidth = (nonConformeBlocks / totalBlocks) * 70;
                doc.setFillColor(211, 47, 47);
                doc.roundedRect(margin + 105, yPosition - 3, nonConformeWidth, 4, 2, 2, 'F');
            }
    
            yPosition += 25;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(50, 50, 50);
            doc.text("Liste des fichiers analysés", margin, yPosition);
            yPosition += 8;
            doc.setFillColor(50, 50, 50);
            doc.rect(margin, yPosition, contentWidth, 8, 'F');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text("Nom du fichier", margin + 5, yPosition + 5.5);
            doc.text("Statut", pageWidth - margin - 16, yPosition + 5.5, { align: 'right' });
            yPosition += 8;
    
            analysisBlocks.forEach((block, index) => {
                if (yPosition + 10 > pageHeight - margin) {
                    doc.addPage();
                    yPosition = margin + 10;
                    doc.setFillColor(211, 47, 47);
                    doc.rect(margin, yPosition - 8, contentWidth, 8, 'F');
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(9);
                    doc.setTextColor(255, 255, 255);
                    doc.text("Nom du fichier", margin + 5, yPosition - 2.5);
                    doc.text("Statut", pageWidth - margin - 20, yPosition - 2.5, { align: 'right' });
                }
    
                doc.setFillColor(index % 2 === 0 ? 247 : 255, 247, 247);
                doc.rect(margin, yPosition, contentWidth, 7, 'F');
                const blockFileName = block.querySelector('.file-name')?.textContent || '';
                const truncatedName = blockFileName.length > 40 ? blockFileName.substring(0, 37) + '...' : blockFileName;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(50, 50, 50);
                doc.text(truncatedName, margin + 5, yPosition + 4.5);
    
                const conformity = block.querySelector('.conformity-status')?.textContent || '';
                const isConforme = conformity === "Conforme";
                const statusX = pageWidth - margin - 35;
                doc.setFillColor(isConforme ? 73 : 211, isConforme ? 158 : 47, isConforme ? 68 : 47);
                doc.roundedRect(statusX, yPosition + 1, 30, 5, 2, 2, 'F');
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7);
                doc.setTextColor(255, 255, 255);
                doc.text(conformity, statusX + 15, yPosition + 4.5, { align: 'center' });
                yPosition += 7;
            });
    
            doc.setDrawColor(200);
            doc.setLineWidth(0.1);
            doc.line(margin, yPosition, margin + contentWidth, yPosition);
    
            // Étape 2 : Ajouter la page de couverture
            doc.addPage();
            yPosition = margin;
    
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(80, 80, 80);
            doc.text("Rapport d'Analyse des Plans", pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 7;
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.text(blocksCounter, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 6;
            const isConformeGlobal = globalConformity === "Conforme";
            doc.setFontSize(12);
            doc.setTextColor(isConformeGlobal ? 73 : 211, isConformeGlobal ? 158 : 47, isConformeGlobal ? 68 : 47);
            doc.text(globalConformity, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 8;
            doc.setDrawColor(200);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 10;
    
            // Étape 3 : Ajouter les blocs d’analyse
            function addAnalysisBlock(block) {
                const blockFileName = block.querySelector('.file-name')?.textContent || '';
                const checksStatus = block.querySelector('.points-checks-valides')?.textContent || '';
                const conformity = block.querySelector('.conformity-status')?.textContent || '';
                const isConforme = conformity === "Conforme";
                const format = block.querySelector('.format-value')?.textContent || 'N/A';
                const orientation = block.querySelector('.orientation-value')?.textContent || 'N/A';
                const dimensions = block.querySelector('.dimensions-value')?.textContent || 'N/A';
                const veiCount = block.querySelector('.vei-count-value')?.textContent || '0';
                const siteName = block.querySelector('.site-name-value')?.textContent || 'Non détecté';
                const siteAddress = block.querySelector('.site-address-value')?.textContent || 'Non détectée';
                const isSiteNameValid = block.querySelector('.site-name-value')?.classList.contains('valid') || false;
                const isSiteAddressValid = block.querySelector('.site-address-value')?.classList.contains('valid') || false;
            
                // Calculer la hauteur totale du bloc gris dynamiquement
                let blockHeight = 0;
                const baseHeight = 100; // Hauteur de base (aperçu, dimensions, adresse)
                const lineHeight = 7; // Hauteur par ligne de texte
                const sectionSpacing = 10; // Espacement entre sections
            
                // Hauteur pour les commentaires
                const textArea = block.querySelector('.editable-text-area');
                let commentHeight = 0;
                let commentText = '';
                if (textArea && textArea.innerText.trim()) {
                    commentText = textArea.innerText.trim();
                    const textsToExclude = [
                        "Picto(s) mal orienté(s)", "Picto(s) PI présent(s)", "Picto(s) PE présent(s)",
                        "Issue(s) d'évacuation mal orientée(s)", "VEI mal orienté(s)", "Point de Rassemblement manquant",
                        "Orthographe", "Légende pas à jour", "Maquette affichée"
                    ];
                    textsToExclude.forEach(text => commentText = commentText.replace(text, ""));
                    commentText = commentText.replace(/\n{2,}/g, "\n").trim();
                    if (commentText) {
                        const commentLines = doc.splitTextToSize(commentText, contentWidth - 15);
                        commentHeight = Math.max(20, (commentLines.length * 4 + 15));
                    }
                }
            
                // Hauteur pour les erreurs
                const activeIcons = block.querySelectorAll('.clickable-icon.active');
                const errorsHeight = activeIcons.length > 0 ? (activeIcons.length * 5 + 15) : 0;
            
                // Hauteur totale du bloc
                blockHeight = baseHeight + commentHeight + errorsHeight + (commentHeight > 0 ? sectionSpacing : 0) + (errorsHeight > 0 ? sectionSpacing : 0);
            
                // Vérifier si une nouvelle page est nécessaire
                checkNewPage(blockHeight);
            
                // Dessiner le fond gris pour tout le bloc
                doc.setFillColor(248, 248, 248);
                doc.roundedRect(margin, yPosition, contentWidth, blockHeight, 3, 3, 'F');
            
                // En-tête du bloc (nom du fichier et statut)
                doc.setFillColor(240, 240, 240);
                doc.rect(margin, yPosition, contentWidth, 10, 'F');
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.setTextColor(60, 60, 60);
                const truncatedFileName = blockFileName.length > 70 ? blockFileName.substring(0, 67) + '...' : blockFileName;
                doc.text(truncatedFileName, margin + 5, yPosition + 7);
            
                // Ajustement pour centrer le texte de conformité dans le fond
                doc.setFontSize(9); // Définir la taille de la police avant de calculer la largeur
                const statusWidth = doc.getStringUnitWidth(conformity) * 9 / doc.internal.scaleFactor; // Ajuster pour la taille de police 9
                const rectX = pageWidth - margin - 5 - statusWidth - 3; // Position X du rectangle
                const rectWidth = statusWidth + 6; // Largeur du rectangle
                const rectCenterX = rectX + (rectWidth / 2); // Centre du rectangle

                doc.setFillColor(isConforme ? 73 : 211, isConforme ? 158 : 47, isConforme ? 68 : 47);
                doc.roundedRect(rectX, yPosition + 2, rectWidth, 7, 2, 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.text(conformity, rectCenterX, yPosition + 7, { align: 'center' }); // Centrer le texte

                yPosition += 15;
            
                // Checks vérifiés
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);
                doc.text(checksStatus, margin + 5, yPosition);
                yPosition += 8;
            
                // Aperçu du fichier
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.setTextColor(70, 70, 70);
                doc.text("Aperçu du fichier:", margin + 5, yPosition);
                yPosition += 5;
            
                const previewX = margin + 5;
                const previewHeight = 25; // Hauteur de l’aperçu
                const canvas = block.querySelector('canvas');
                if (canvas) {
                    // Créer un canvas temporaire pour l’export PDF
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    const tempCtx = tempCanvas.getContext('2d');
            
                    // Ajouter un fond blanc au canvas temporaire
                    tempCtx.fillStyle = 'white';
                    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
                    // Copier le contenu du canvas original sur le canvas temporaire
                    tempCtx.drawImage(canvas, 0, 0);
            
                    // Exporter le canvas temporaire en image
                    const imgData = tempCanvas.toDataURL('image/jpeg', 0.8);
                    doc.addImage(imgData, 'JPEG', previewX, yPosition, 40, previewHeight, undefined, 'FAST');
                }
            
                // Calculer la position verticale pour centrer le bloc de texte
                const dimensionsX = previewX + 45;
                const textBlockHeight = 4 * 7; // 4 lignes (Format, Orientation, Dimensions, VEI) × 7 mm par ligne = 28 mm
                const previewCenter = yPosition + (previewHeight / 2); // Centre de l’aperçu
                const textBlockCenterOffset = textBlockHeight / 2; // Centre du bloc de texte
                const textStartYPosition = previewCenter - textBlockCenterOffset + 2; //Position de départ pour centrer le texte
            
                // Afficher le bloc de texte (Format, Orientation, Dimensions, Nombre de VEI détectés)
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);
                let textYPosition = textStartYPosition; // Position de départ ajustée pour le centrage
                doc.text(`Format: ${format}`, dimensionsX, textYPosition);
                textYPosition += 7;
                doc.text(`Orientation: ${orientation}`, dimensionsX, textYPosition);
                textYPosition += 7;
                const truncatedDim = dimensions.length > 35 ? dimensions.substring(0, 32) + '...' : dimensions;
                doc.text(`Dimensions: ${truncatedDim}`, dimensionsX, textYPosition);
                textYPosition += 7;
                doc.text(`Nombre de VEI détectés: ${veiCount}`, dimensionsX, textYPosition);
            
                // Ajuster yPosition pour la suite (bas de l’aperçu)
                yPosition += previewHeight + 5;
            
                // Ligne de séparation
                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.1);
                doc.line(margin + 5, yPosition, pageWidth - margin - 5, yPosition);
                yPosition += 7;
            
                // Vérification des informations du site (adresse)
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);
                doc.text("Vérification des informations du site", margin + 5, yPosition);
                yPosition += 7;

                const siteCheckIcon = block.querySelector('.details-item:nth-child(2) .check-icon');
                const isAddressValid = siteCheckIcon && siteCheckIcon.src.includes('ok-icon.svg');
            
                // Pastille pour le nom du site (vert si adresse valide, car liée au même check-icon)
                doc.setFillColor(isAddressValid ? 73 : 211, isAddressValid ? 158 : 47, isAddressValid ? 68 : 47);
                doc.circle(margin + 5, yPosition - 1, 1.5, 'F');
                doc.setFont("helvetica", "normal");
                doc.setTextColor(80, 80, 80);
                doc.text(`Nom du site détecté: ${siteName}`, margin + 10, yPosition);
                yPosition += 7;

                // Pastille pour l’adresse (idem, basée sur le check-icon)
                doc.setFillColor(isAddressValid ? 73 : 211, isAddressValid ? 158 : 47, isAddressValid ? 68 : 47);
                doc.circle(margin + 5, yPosition - 1, 1.5, 'F');
                doc.setTextColor(80, 80, 80);
                doc.text(`Adresse du site détectée: ${siteAddress}`, margin + 10, yPosition);
                yPosition += 10;
            
                // Commentaires (s’il y en a)
                if (commentText) {
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(10);
                    doc.setTextColor(80, 80, 80);
                    doc.text("Commentaires:", margin + 5, yPosition);
                    doc.setFont("helvetica", "italic");
                    doc.setFontSize(9);
                    doc.setTextColor(100, 100, 100);
                    const commentLines = doc.splitTextToSize(commentText, contentWidth - 15);
                    doc.setFillColor(255, 255, 250);
                    doc.roundedRect(margin + 5, yPosition + 2, contentWidth - 10, commentLines.length * 4 + 6, 2, 2, 'F');
                    doc.text(commentLines, margin + 10, yPosition + 8);
                    yPosition += commentHeight;
                }
            
                // Erreurs relevées (incluses dans le fond gris)
                if (activeIcons.length > 0) {
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(10);
                    doc.setTextColor(211, 47, 47);
                    doc.text("Erreurs relevées:", margin + 5, yPosition + 5);
                    yPosition += 10;
            
                    activeIcons.forEach((icon) => {
                        const iconName = icon.getAttribute('data-icon-name') || 'Erreur non spécifiée';
                        const iconType = icon.getAttribute('data-icon-type') || '';
                        let iconColor = [211, 47, 47];
                        if (iconType === 'vei') iconColor = [211, 47, 47];
                        if (iconType === 'picto') iconColor = [211, 47, 47];
                        if (iconType === 'evac') iconColor = [211, 47, 47];
                        doc.setFillColor(...iconColor);
                        doc.circle(margin + 10, yPosition, 1.5, 'F');
                        doc.setTextColor(80, 80, 80);
                        doc.text(iconName, margin + 15, yPosition + 1);
                        yPosition += 5;
                    });
                    yPosition += 5;
                }
            
                // Ajouter un espace après le bloc
                yPosition += 15;
            }
    
            // Ajouter les blocs d’analyse après la page de couverture
            analysisBlocks.forEach(addAnalysisBlock);
    
            // Étape 4 : Ajouter les numéros de page et le pied de page
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                yPosition = pageHeight - 10;
                doc.setFont("helvetica", "italic");
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text("Document généré automatiquement par FirePlan Checker", pageWidth / 2, yPosition, { align: 'center' });
                yPosition += 3;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.text(`© ${new Date().getFullYear()} - Tous droits réservés`, pageWidth / 2, yPosition, { align: 'center' });
    
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Page ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            }
    
            // Sauvegarder le PDF
            doc.save(`Compte rendu - ${fileName}.pdf`);
            collapsedBlocks.forEach(block => block.classList.add('collapsed'));
        } catch (error) {
            console.error('Erreur lors de la génération du PDF:', error);
            alert('Une erreur est survenue lors de la génération du PDF.');
        } finally {
            document.body.removeChild(loadingIndicator);
        }
    }

    function updateStatusIcon(analysisBlock) {
        const statusIcon = analysisBlock.querySelector('.status-icon');
        const hasActiveIcons = analysisBlock.querySelector('.clickable-icon.active') !== null;
        const hasText = analysisBlock.querySelector('.editable-text-area').innerText.trim() !== '';
        statusIcon.src = (hasActiveIcons || hasText) ? "../assets/icons/error-icon.svg" : "../assets/icons/ok-icon.svg";
        statusIcon.alt = (hasActiveIcons || hasText) ? "Error Icon" : "Ok Icon";
        updatePointsChecks(analysisBlock);
        updateGlobalConformity();
    }

    function showConfirmationPopup(source) {
        const popup = document.getElementById('confirmation-popup');
        if (popup) {
            popup.classList.add('active');
            popup.setAttribute('data-source', source);
        }
    }

    function closePopup() {
        const popup = document.getElementById('confirmation-popup');
        popup.classList.remove('active');
        popup.removeAttribute('data-source');
    }

    function isOnImportedFilesPage() {
        return document.querySelector('.analysis-content') !== null;
    }

    function showSavedMessage(container) {
        let savedMessage = container.querySelector('.saved-message');
        if (!savedMessage) {
            savedMessage = document.createElement('div');
            savedMessage.className = 'saved-message';
            savedMessage.textContent = 'Commentaire enregistré';
            container.appendChild(savedMessage);
        }
        savedMessage.style.opacity = "1";
        setTimeout(() => savedMessage.style.opacity = "0", 2000);
    }

    function extractVEICountFromFileName(fileName) {
        const veiPattern = /VEI[_-]?(\d+)/i;
        const match = fileName.match(veiPattern);
        return match && match[1] ? parseInt(match[1], 10) : null;
    }

    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.classList.add('compact-header');
        } else {
            header.classList.remove('compact-header');
        }
    });
});