// Paragraph Mode Variables
let paragraphMode = false;
let currentParagraphIndex = 0;
let paragraphs = [];

// Get elements
const paragraphModeCheckbox = document.getElementById('paragraphMode');
const paragraphControls = document.getElementById('paragraphControls');
const prevParagraphBtn = document.getElementById('prevParagraph');
const nextParagraphBtn = document.getElementById('nextParagraph');
const paragraphIndicator = document.getElementById('paragraphIndicator');

// Toggle paragraph mode
paragraphModeCheckbox.addEventListener('change', (e) => {
    paragraphMode = e.target.checked;

    if (paragraphMode) {
        // Show controls
        paragraphControls.style.display = 'flex';

        // Split into paragraphs
        const text = lawText.textContent.trim();
        paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);

        if (paragraphs.length === 0) {
            paragraphs = [text];
        }

        currentParagraphIndex = 0;
        showCurrentParagraph();
    } else {
        // Hide controls and show full text
        paragraphControls.style.display = 'none';
        // Restore original text (you'll need to store it)
        updateParagraphButtons();
    }
});

// Show current paragraph
function showCurrentParagraph() {
    if (paragraphs.length > 0) {
        lawText.textContent = paragraphs[currentParagraphIndex];
        updateParagraphIndicator();
        updateParagraphButtons();
    }
}

// Update indicator
function updateParagraphIndicator() {
    paragraphIndicator.textContent = `${currentParagraphIndex + 1}/${paragraphs.length}`;
}

// Update button states
function updateParagraphButtons() {
    prevParagraphBtn.disabled = currentParagraphIndex === 0;
    nextParagraphBtn.disabled = currentParagraphIndex === paragraphs.length - 1;
}

// Previous paragraph
prevParagraphBtn.addEventListener('click', () => {
    if (currentParagraphIndex > 0) {
        currentParagraphIndex--;
        showCurrentParagraph();
        stopText(); // Stop current playback
    }
});

// Next paragraph
nextParagraphBtn.addEventListener('click', () => {
    if (currentParagraphIndex < paragraphs.length - 1) {
        currentParagraphIndex++;
        showCurrentParagraph();
        stopText(); // Stop current playback
    }
});
