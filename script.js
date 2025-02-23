let timeoutId;
let isDarkMode = true;

document.getElementById('textInput').addEventListener('input', () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(convertTextToGrid, 300);
});

document.getElementById('gridSizeSelect').addEventListener('change', handleGridSizeChange);
document.getElementById('verticalCheckbox').addEventListener('change', updateGridDisplay);
document.getElementById('fillModeSelect').addEventListener('change', convertTextToGrid);
document.getElementById('themeToggle').addEventListener('click', toggleTheme);
document.getElementById('copyButton').addEventListener('click', copyOutput);
document.getElementById('downloadButton').addEventListener('click', downloadGridImage);

function handleGridSizeChange() {
    const gridSize = parseInt(document.getElementById('gridSizeSelect').value);
    if (gridSize === 64) {
        document.getElementById('verticalCheckbox').checked = true;
    }
    updateGridDisplay();
    convertTextToGrid();
}

function updateGridDisplay() {
    const isVertical = document.getElementById('verticalCheckbox').checked;
    const gridContainer = document.getElementById('gridContainer');

    if (isVertical) {
        gridContainer.style.flexDirection = 'column';
        gridContainer.style.flexWrap = 'nowrap';
    } else {
        gridContainer.style.flexDirection = 'row';
        gridContainer.style.flexWrap = 'wrap';
    }
}

function convertTextToGrid() {
    const text = document.getElementById('textInput').value;
    const gridSize = parseInt(document.getElementById('gridSizeSelect').value);
    const fillMode = document.getElementById('fillModeSelect').value;
    const gridContainer = document.getElementById('gridContainer');
    gridContainer.innerHTML = '';

    const textLength = text.length;
    let scale = 4;

    if (textLength > 0) {
        scale = Math.max(1, Math.floor(16 / textLength));
        scale = Math.min(scale, 8)
    }

    for (const char of text) {
        const grid = createLetterGrid(char, gridSize, fillMode, text, scale);
        gridContainer.appendChild(grid);
    }
}

function createLetterGrid(char, gridSize, fillMode, fullText, scale) {
    const gridDiv = document.createElement('div');
    gridDiv.classList.add('letter-grid');

    const gridPixelSize = gridSize * scale;
    const cellPixelSize = gridPixelSize / gridSize;

    gridDiv.style.width = `${gridPixelSize}px`;
    gridDiv.style.height = `${gridPixelSize}px`;
    gridDiv.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    gridDiv.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

    const canvas = document.createElement('canvas');
    canvas.width = gridSize;
    canvas.height = gridSize;
    const ctx = canvas.getContext('2d');

    ctx.font = `${gridSize}px monospace`;
    ctx.fillStyle = 'black'; // This is important for drawing the initial character
    ctx.textBaseline = 'top';
    ctx.fillText(char, 0, 0);

    const imageData = ctx.getImageData(0, 0, gridSize, gridSize);
    const pixelData = imageData.data;

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.style.width = `${cellPixelSize}px`;
            cell.style.height = `${cellPixelSize}px`;
            cell.style.fontSize = `${cellPixelSize * 0.8}px`;

            const index = (y * gridSize + x) * 4;
            const alpha = pixelData[index + 3];

            // ALWAYS add 'on' or 'off' based on alpha
            if (alpha > 128) {
                cell.classList.add('on');
            } else {
                cell.classList.add('off');
            }

            // Set textContent based on fillMode
            if (fillMode === 'character') {
                cell.textContent = alpha > 128 ? char : " ";
            } else if (fillMode === 'fullWord') {
                cell.textContent = alpha > 128 ? fullText : " ";
            }  // No 'else' for blackWhite, handled by classes

            gridDiv.appendChild(cell);
        }
    }

    return gridDiv;
}
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-theme');
}

function copyOutput() {
  //copy output code, unchanged
    const gridContainer = document.getElementById('gridContainer');
    const fillMode = document.getElementById('fillModeSelect').value;
    const copyTarget = document.getElementById('copyTargetSelect').value;
    let outputText = '';

    if (copyTarget === 'discord') {
        outputText += '```\n';
    }

    const letterGrids = gridContainer.querySelectorAll('.letter-grid');

    let maxWordLength = 0;
    if (fillMode === 'fullWord' && (copyTarget === 'notepad' || copyTarget === 'other')) {
        letterGrids.forEach(grid => {
            const gridCells = grid.querySelectorAll('.grid-cell');
            gridCells.forEach(cell => {
                if (cell.textContent.trim() !== '') {
                    maxWordLength = Math.max(maxWordLength, cell.textContent.trim().length);
                }
            });
        });
        if (maxWordLength === 0) maxWordLength = 1;
    }

    letterGrids.forEach((grid) => {
        const gridCells = grid.querySelectorAll('.grid-cell');
        const gridSize = Math.sqrt(gridCells.length);

        gridCells.forEach((cell, cellIndex) => {
            let cellContent = '';

            if (fillMode === 'blackWhite') {
                if (copyTarget === 'discord') {
                    cellContent = cell.classList.contains('on') ? '██' : '  ';
                } else {
                    cellContent = cell.classList.contains('on') ? '█' : '\xA0';
                }
            } else if (fillMode === 'character') {
                if (copyTarget === 'discord') {
                    cellContent = cell.textContent.trim() !== '' ? cell.textContent : '  ';
                } else {
                    cellContent = cell.textContent.trim() !== '' ? cell.textContent : '\xA0';
                }
            } else {
                if (copyTarget === 'discord') {
                    cellContent = cell.textContent.trim() !== '' ? cell.textContent.substring(0, 2) : '  ';
                } else {
                    let word = cell.textContent.trim();
                    if (word !== '') {
                        cellContent = word.padEnd(maxWordLength, '\xA0');
                    } else {
                        cellContent = '\xA0'.repeat(maxWordLength);
                    }
                }
            }

            outputText += cellContent;

            if ((cellIndex + 1) % gridSize === 0) {
                outputText += '\n';
            }
        });
        outputText += '\n';
    });

    if (copyTarget === 'discord') {
        outputText += '```';
    }

    navigator.clipboard.writeText(outputText)
        .then(() => {
            const messageDiv = document.getElementById('copyMessage');
            messageDiv.style.display = 'block';
            setTimeout(() => { messageDiv.style.display = 'none'; }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
            alert('Failed to copy output.  Please copy manually.');
        });
}

function downloadGridImage() {
    const gridContainer = document.getElementById('gridContainer');
    const downloadMessageDiv = document.getElementById('downloadMessage');

    // Store original classes
    const originalClasses = [];
    const gridCells = gridContainer.querySelectorAll('.grid-cell');

    gridCells.forEach(cell => {
        originalClasses.push(cell.className);
        cell.classList.remove('on', 'off');  // Remove 'on' and 'off'
        cell.classList.add('image-cell');    // Add 'image-cell' (white background)
    });

    // Capture the image
    html2canvas(gridContainer, { scale: 3 }).then(canvas => {
        const dataURL = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = dataURL;
        downloadLink.download = 'grid_output.png';

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        downloadMessageDiv.style.display = 'block';
        setTimeout(() => { downloadMessageDiv.style.display = 'none'; }, 2000);

        // Restore original classes
        gridCells.forEach((cell, index) => {
            cell.classList.remove('image-cell');
            cell.className = originalClasses[index]; // Restore original classes
        });

    }).catch(error => {
        console.error('Error capturing grid as image:', error);
        alert('Failed to download image. Please try again.');
    });
}
// Initial setup
updateGridDisplay();
