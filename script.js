// Text-to-Speech Implementation
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let voices = [];
let isPaused = false;

// DOM Elements
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const rateSlider = document.getElementById('rate');
const pitchSlider = document.getElementById('pitch');
const voiceSelect = document.getElementById('voice');
const lawText = document.getElementById('lawText');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const rateValue = document.getElementById('rateValue');
const pitchValue = document.getElementById('pitchValue');
const playBtnText = document.getElementById('playBtnText');

// Articles Data with localStorage
let articles = {};
let nextArticleId = 1;

// Categories Data with localStorage
let categories = [];

// Default categories
const defaultCategories = [
    'ประมวลกฎหมายอาญา',
    'แพ่งและพาณิชย์',
    'กฎหมายวิธีพิจารณาความอาญา',
    'กฎหมายวิธีพิจารณาความแพ่ง',
    'รัฐธรรมนูญ',
    'อื่นๆ'
];

// Load categories from localStorage
function loadCategoriesFromStorage() {
    const savedCategories = localStorage.getItem('lawFlowCategories');
    if (savedCategories) {
        categories = JSON.parse(savedCategories);
    } else {
        categories = [...defaultCategories];
        saveCategoriesToStorage();
    }
}

// Save categories to localStorage
function saveCategoriesToStorage() {
    localStorage.setItem('lawFlowCategories', JSON.stringify(categories));
}

// Load articles from localStorage or use defaults
function loadArticlesFromStorage() {
    const savedArticles = localStorage.getItem('lawFlowArticles');
    const savedNextId = localStorage.getItem('lawFlowNextId');

    if (savedArticles) {
        articles = JSON.parse(savedArticles);
        nextArticleId = savedNextId ? parseInt(savedNextId) : Object.keys(articles).length + 1;
    } else {
        // Default articles
        articles = {
            1: {
                number: "มาตรา 1",
                category: "แพ่งและพาณิชย์",
                content: "กฎหมายนี้เรียกว่า ประมวลกฎหมายแพ่งและพาณิชย์"
            },
            2: {
                number: "มาตรา 276",
                category: "ประมวลกฎหมายอาญา",
                content: "ผู้ใดฆ่าผู้อื่นต้องระวางโทษประหารชีวิต จำคุกตลอดชีวิต หรือจำคุกตั้งแต่สิบห้าปีถึงยี่สิบปี"
            },
            3: {
                number: "มาตรา 157",
                category: "แพ่งและพาณิชย์",
                content: "บุคคลย่อมบรรลุนิติภาวะเมื่อมีอายุได้ยี่สิบปีบริบูรณ์"
            }
        };
        nextArticleId = 4;
        saveArticlesToStorage();
    }
}

// Save articles to localStorage
function saveArticlesToStorage() {
    localStorage.setItem('lawFlowArticles', JSON.stringify(articles));
    localStorage.setItem('lawFlowNextId', nextArticleId.toString());
}

// Initialize articles and categories
loadCategoriesFromStorage();
loadArticlesFromStorage();

// Load voices
function loadVoices() {
    voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = '';

    // Filter Thai voices first, then all voices
    const thaiVoices = voices.filter(voice => voice.lang.includes('th'));
    const otherVoices = voices.filter(voice => !voice.lang.includes('th'));

    // Add Thai voices
    if (thaiVoices.length > 0) {
        const thaiGroup = document.createElement('optgroup');
        thaiGroup.label = 'เสียงภาษาไทย';
        thaiVoices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = voices.indexOf(voice);
            option.textContent = `${voice.name} (${voice.lang})`;
            thaiGroup.appendChild(option);
        });
        voiceSelect.appendChild(thaiGroup);
    }

    // Add other voices
    if (otherVoices.length > 0) {
        const otherGroup = document.createElement('optgroup');
        otherGroup.label = 'เสียงภาษาอื่นๆ';
        otherVoices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = voices.indexOf(voice);
            option.textContent = `${voice.name} (${voice.lang})`;
            otherGroup.appendChild(option);
        });
        voiceSelect.appendChild(otherGroup);
    }

    // Set default to Thai voice if available
    if (thaiVoices.length > 0) {
        voiceSelect.value = voices.indexOf(thaiVoices[0]);
    }

    // Show warning if no Thai voices available
    if (thaiVoices.length === 0) {
        showNoThaiVoiceWarning();
    } else {
        hideNoThaiVoiceWarning();
    }
}

// Initialize voices
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

// Split text into paragraphs and sentences with metadata
function splitIntoSentences(text) {
    const chunks = [];

    // Split by double line breaks (paragraphs)
    const paragraphs = text.split(/\n\n+/);

    paragraphs.forEach((paragraph, pIndex) => {
        const trimmedPara = paragraph.trim();
        if (!trimmedPara) return;

        // Split paragraph into sentences
        const sentences = trimmedPara.split(/([.!?。]\s+)/).filter(s => s.trim().length > 0);

        sentences.forEach((sentence, sIndex) => {
            const trimmedSent = sentence.trim();
            if (!trimmedSent) return;

            chunks.push({
                text: trimmedSent,
                isLastInParagraph: sIndex === sentences.length - 1,
                paragraphIndex: pIndex
            });
        });
    });

    return chunks;
}

// Play Speech with paragraph-aware reading
let currentSentenceIndex = 0;
let sentences = [];
let isSpeaking = false;

function playText() {
    const text = lawText.textContent.trim();

    if (!text) {
        alert('ไม่พบข้อความที่จะอ่าน');
        return;
    }

    // If already speaking and paused, resume
    if (isPaused && currentUtterance) {
        speechSynthesis.resume();
        isPaused = false;
        updateButtonStates('playing');
        return;
    }

    // Stop any ongoing speech
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }

    // Split text into sentences with paragraph info
    sentences = splitIntoSentences(text);
    currentSentenceIndex = 0;
    isSpeaking = true;

    // Start reading from first sentence
    updateButtonStates('playing');
    lawText.classList.add('speaking');
    progressText.textContent = 'กำลังอ่าน...';
    progressBar.style.width = '0%';

    speakNextSentence();
}

function speakNextSentence() {
    if (!isSpeaking || currentSentenceIndex >= sentences.length) {
        // Check if repeat mode is enabled
        const repeatMode = document.getElementById('repeatMode');

        if (repeatMode && repeatMode.checked && isSpeaking) {
            // Restart from beginning
            currentSentenceIndex = 0;
            progressBar.style.width = '0%';
            progressText.textContent = '🔁 กำลังอ่านซ้ำ...';

            // Small delay before restart
            setTimeout(() => {
                if (isSpeaking) {
                    speakNextSentence();
                }
            }, 1000);
            return;
        }

        // Finished reading all sentences (no repeat)
        updateButtonStates('stopped');
        lawText.classList.remove('speaking');
        progressBar.style.width = '100%';
        progressText.textContent = 'อ่านเสร็จแล้ว';
        setTimeout(() => {
            progressBar.style.width = '0%';
            progressText.textContent = 'พร้อมฟัง';
        }, 2000);
        isSpeaking = false;
        return;
    }

    const chunk = sentences[currentSentenceIndex];

    // Create new utterance for this sentence
    currentUtterance = new SpeechSynthesisUtterance(chunk.text);

    // Set voice
    const selectedVoiceIndex = voiceSelect.value;
    if (voices[selectedVoiceIndex]) {
        currentUtterance.voice = voices[selectedVoiceIndex];
    }

    // Set rate and pitch
    currentUtterance.rate = parseFloat(rateSlider.value);
    currentUtterance.pitch = parseFloat(pitchSlider.value);

    // Update progress
    const progress = ((currentSentenceIndex + 1) / sentences.length) * 100;
    progressBar.style.width = progress + '%';

    currentUtterance.onend = () => {
        currentSentenceIndex++;

        // Determine pause duration
        // 1000ms after paragraph end, 300ms between sentences
        const pauseDuration = chunk.isLastInParagraph ? 1000 : 300;

        // Add pause between sentences/paragraphs
        setTimeout(() => {
            if (isSpeaking) {
                speakNextSentence();
            }
        }, pauseDuration);
    };

    currentUtterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        updateButtonStates('stopped');
        lawText.classList.remove('speaking');
        progressText.textContent = 'เกิดข้อผิดพลาด';
        isSpeaking = false;
    };

    // Start speaking this sentence
    speechSynthesis.speak(currentUtterance);
}

// Pause Speech
function pauseText() {
    if (speechSynthesis.speaking && !isPaused) {
        speechSynthesis.pause();
        isPaused = true;
        updateButtonStates('paused');
        lawText.classList.remove('speaking');
        progressText.textContent = 'หยุดชั่วคราว';
    }
}

// Stop Speech
function stopText() {
    speechSynthesis.cancel();
    isPaused = false;
    isSpeaking = false;
    currentSentenceIndex = 0;
    updateButtonStates('stopped');
    lawText.classList.remove('speaking');
    progressBar.style.width = '0%';
    progressText.textContent = 'พร้อมฟัง';
}

// Update button states
function updateButtonStates(state) {
    switch (state) {
        case 'playing':
            playBtn.disabled = true;
            pauseBtn.disabled = false;
            stopBtn.disabled = false;
            playBtnText.textContent = 'กำลังเล่น...';
            playBtn.querySelector('.icon').textContent = '🔊';
            break;
        case 'paused':
            playBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = false;
            playBtnText.textContent = 'เล่นต่อ';
            playBtn.querySelector('.icon').textContent = '▶️';
            break;
        case 'stopped':
            playBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = true;
            playBtnText.textContent = 'เล่นเสียง';
            playBtn.querySelector('.icon').textContent = '▶️';
            isPaused = false;
            break;
    }
}

// Update rate display
rateSlider.addEventListener('input', (e) => {
    rateValue.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
});

// Initialize rate display
rateValue.textContent = '0.8x';

// Update pitch display
pitchSlider.addEventListener('input', (e) => {
    pitchValue.textContent = parseFloat(e.target.value).toFixed(1);
});

// Event listeners
playBtn.addEventListener('click', playText);
pauseBtn.addEventListener('click', pauseText);
stopBtn.addEventListener('click', stopText);

// Example card clicks and rendering
let currentFilter = 'all';

function renderArticleCards(filterCategory = 'all') {
    const exampleGrid = document.querySelector('.example-grid');
    exampleGrid.innerHTML = '';

    // Count articles by category
    const categoryCounts = {
        'all': 0,
        'ประมวลกฎหมายอาญา': 0,
        'แพ่งและพาณิชย์': 0,
        'กฎหมายวิธีพิจารณาความอาญา': 0,
        'กฎหมายวิธีพิจารณาความแพ่ง': 0,
        'รัฐธรรมนูญ': 0,
        'อื่นๆ': 0
    };

    Object.keys(articles).forEach(articleId => {
        const article = articles[articleId];
        categoryCounts['all']++;
        categoryCounts[article.category] = (categoryCounts[article.category] || 0) + 1;

        // Filter logic
        if (filterCategory !== 'all' && article.category !== filterCategory) {
            return; // Skip this article
        }

        const card = document.createElement('div');
        card.className = 'example-card';
        card.dataset.article = articleId;

        card.innerHTML = `
            <button class="btn-delete" data-article-id="${articleId}">🗑️</button>
            <button class="btn-edit-article" data-article-id="${articleId}">✏️</button>
            <span class="example-number">${article.number}</span>
            <p class="example-preview">${article.content}</p>
            <span class="example-category">${article.category}</span>
        `;

        exampleGrid.appendChild(card);
    });

    // Update counts in filter buttons
    updateFilterCounts(categoryCounts);

    // Re-attach event listeners
    attachCardEventListeners();
}

function updateFilterCounts(counts) {
    // Update "all" count
    const allCountEl = document.getElementById('count-all');
    if (allCountEl) allCountEl.textContent = counts['all'] || 0;

    // Update category counts dynamically
    categories.forEach(category => {
        const id = getCategoryId(category);
        const countEl = document.getElementById(`count-${id}`);
        if (countEl) {
            countEl.textContent = counts[category] || 0;
        }
    });
}

// Helper function to get category ID for count element
function getCategoryId(category) {
    const ids = {
        'ประมวลกฎหมายอาญา': 'อาญา',
        'แพ่งและพาณิชย์': 'แพ่ง',
        'กฎหมายวิธีพิจารณาความอาญา': 'วิอาญา',
        'กฎหมายวิธีพิจารณาความแพ่ง': 'วิแพ่ง',
        'รัฐธรรมนูญ': 'รธน',
        'อื่นๆ': 'อื่นๆ'
    };
    return ids[category] || category.replace(/\s+/g, '-');
}

// Helper function to get short category name
function getCategoryShortName(category) {
    const shortNames = {
        'ประมวลกฎหมายอาญา': 'อาญา',
        'แพ่งและพาณิชย์': 'แพ่ง',
        'กฎหมายวิธีพิจารณาความอาญา': 'วิ.อาญา',
        'กฎหมายวิธีพิจารณาความแพ่ง': 'วิ.แพ่ง',
        'รัฐธรรมนูญ': 'รธน.',
        'อื่นๆ': 'อื่นๆ'
    };
    return shortNames[category] || category;
}

// Dynamic Category Filter Rendering
function renderCategoryFilters() {
    const categoryFiltersDiv = document.querySelector('.category-filters');
    categoryFiltersDiv.innerHTML = '';

    // Add "ทั้งหมด" button
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn' + (currentFilter === 'all' ? ' active' : '');
    allBtn.dataset.category = 'all';
    allBtn.innerHTML = 'ทั้งหมด <span class="count" id="count-all">0</span>';
    categoryFiltersDiv.appendChild(allBtn);

    // Add category buttons
    categories.forEach((category) => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn' + (currentFilter === category ? ' active' : '');
        btn.dataset.category = category;

        const shortName = getCategoryShortName(category);
        const countId = `count-${getCategoryId(category)}`;

        btn.innerHTML = `
            ${shortName} <span class="count" id="${countId}">0</span>
            <button class="btn-delete-category" data-category="${category}">✕</button>
        `;

        categoryFiltersDiv.appendChild(btn);
    });

    // Add "add category" button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-add-category';
    addBtn.id = 'addCategoryBtn';
    addBtn.title = 'เพิ่มหมวดหมู่ใหม่';
    addBtn.textContent = '➕';
    categoryFiltersDiv.appendChild(addBtn);

    // Attach event listeners
    attachFilterEventListeners();
}

// Add category
function addCategory(categoryName) {
    if (!categoryName || categoryName.trim() === '') return;

    const trimmedName = categoryName.trim();

    // Check if already exists
    if (categories.includes(trimmedName)) {
        alert('หมวดหมู่นี้มีอยู่แล้ว');
        return false;
    }

    categories.push(trimmedName);
    saveCategoriesToStorage();
    renderCategoryFilters();
    renderArticleCards(currentFilter);
    return true;
}

// Delete category
function deleteCategory(categoryName) {
    // Check if any articles use this category
    const articlesInCategory = Object.values(articles).filter(a => a.category === categoryName);

    if (articlesInCategory.length > 0) {
        const confirmed = confirm(`หมวดหมู่ "${categoryName}" มีมาตรา ${articlesInCategory.length} รายการ\n\nต้องการลบหมวดหมู่นี้หรือไม่? (มาตราทั้งหมดจะถูกย้ายไปหมวด "อื่นๆ")`);
        if (!confirmed) return;

        // Move articles to "อื่นๆ"
        articlesInCategory.forEach(article => {
            const articleId = Object.keys(articles).find(id => articles[id] === article);
            articles[articleId].category = 'อื่นๆ';
        });
        saveArticlesToStorage();
    } else {
        const confirmed = confirm(`ต้องการลบหมวดหมู่ "${categoryName}" หรือไม่?`);
        if (!confirmed) return;
    }

    // Remove from categories
    const index = categories.indexOf(categoryName);
    if (index > -1) {
        categories.splice(index, 1);
        saveCategoriesToStorage();
    }

    // Reset filter if current filter was deleted
    if (currentFilter === categoryName) {
        currentFilter = 'all';
    }

    renderCategoryFilters();
    renderArticleCards(currentFilter);
}

// Attach filter event listeners
function attachFilterEventListeners() {
    // Filter button clicks
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Don't trigger if clicking delete button
            if (e.target.classList.contains('btn-delete-category')) {
                return;
            }

            const category = btn.dataset.category;
            currentFilter = category;

            // Update active state
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Re-render with filter
            renderArticleCards(category);
        });
    });

    // Delete category buttons
    document.querySelectorAll('.btn-delete-category').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const category = btn.dataset.category;
            deleteCategory(category);
        });
    });

    // Add category button
    const addBtn = document.getElementById('addCategoryBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            document.getElementById('addCategoryModal').classList.add('active');
        });
    }
}

function attachCardEventListeners() {
    // Card click to view article
    document.querySelectorAll('.example-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking delete button
            if (e.target.classList.contains('btn-delete') || e.target.closest('.btn-delete')) {
                return;
            }

            const articleId = card.dataset.article;
            const article = articles[articleId];

            if (article) {
                // Update the main article display
                document.querySelector('.article-number').textContent = article.number;
                document.querySelector('.category-badge').textContent = article.category;
                lawText.innerHTML = `<p>${article.content}</p>`;

                // Stop current speech
                stopText();

                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // Add highlight animation
                const articleCard = document.querySelector('.article-card');
                articleCard.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    articleCard.style.transform = 'scale(1)';
                }, 200);
            }
        });
    });

    // Delete button clicks
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const articleId = btn.dataset.articleId;
            deleteArticle(articleId);
        });
    });

    // Edit button clicks
    document.querySelectorAll('.btn-edit-article').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const articleId = btn.dataset.articleId;
            editArticle(articleId);
        });
    });
}

// Delete article
function deleteArticle(articleId) {
    if (confirm(`ต้องการลบ "${articles[articleId].number}" ใช่หรือไม่?`)) {
        delete articles[articleId];
        saveArticlesToStorage();
        renderArticleCards(currentFilter);
    }
}

// Edit article
function editArticle(articleId) {
    const article = articles[articleId];

    // Fill form with existing data
    document.getElementById('articleNumber').value = article.number;
    document.getElementById('articleCategory').value = article.category;
    document.getElementById('articleContent').value = article.content;

    // Store article ID for updating
    document.getElementById('addArticleForm').dataset.editingId = articleId;

    // Change modal title
    document.querySelector('#addArticleModal .modal-header h2').textContent = 'แก้ไขมาตรา';

    // Open modal
    document.getElementById('addArticleModal').classList.add('active');
}

// Modal controls
const modal = document.getElementById('addArticleModal');
const addArticleBtn = document.getElementById('addArticleBtn');
const closeModalBtn = document.getElementById('closeModal');
const cancelModalBtn = document.getElementById('cancelModal');
const addArticleForm = document.getElementById('addArticleForm');

// Open modal
addArticleBtn.addEventListener('click', () => {
    modal.classList.add('active');
});

// Close modal
function closeModal() {
    modal.classList.remove('active');
    addArticleForm.reset();
}

closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);

// Close modal when clicking outside
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Add article form submission
addArticleForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const number = document.getElementById('articleNumber').value.trim();
    const category = document.getElementById('articleCategory').value;
    const content = document.getElementById('articleContent').value.trim();

    // Check if editing existing article
    const editingId = addArticleForm.dataset.editingId;

    if (editingId) {
        // Update existing article
        articles[editingId] = {
            number: number,
            category: category,
            content: content
        };
        delete addArticleForm.dataset.editingId;
        alert('แก้ไขมาตราเรียบร้อยแล้ว!');
    } else {
        // Add new article
        articles[nextArticleId] = {
            number: number,
            category: category,
            content: content
        };
        nextArticleId++;
        alert('เพิ่มมาตราเรียบร้อยแล้ว!');
    }

    saveArticlesToStorage();
    renderArticleCards(currentFilter);
    closeModal();
});

// Initialize
renderCategoryFilters();
renderArticleCards();
updateButtonStates('stopped');

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Space bar to play/pause
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (speechSynthesis.speaking && !isPaused) {
            pauseText();
        } else {
            playText();
        }
    }

    // Escape to stop or close modals
    if (e.code === 'Escape') {
        const categoryModal = document.getElementById('addCategoryModal');
        if (modal.classList.contains('active')) {
            closeModal();
        } else if (categoryModal && categoryModal.classList.contains('active')) {
            closeCategoryModal();
        } else {
            stopText();
        }
    }
});

// Category Modal controls
const categoryModal = document.getElementById('addCategoryModal');
const closeCategoryModalBtn = document.getElementById('closeCategoryModal');
const cancelCategoryModalBtn = document.getElementById('cancelCategoryModal');
const addCategoryForm = document.getElementById('addCategoryForm');

function closeCategoryModal() {
    categoryModal.classList.remove('active');
    addCategoryForm.reset();
}

closeCategoryModalBtn.addEventListener('click', closeCategoryModal);
cancelCategoryModalBtn.addEventListener('click', closeCategoryModal);

// Close modal when clicking outside
categoryModal.addEventListener('click', (e) => {
    if (e.target === categoryModal) {
        closeCategoryModal();
    }
});

// Add category form submission
addCategoryForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const categoryName = document.getElementById('categoryName').value.trim();

    if (addCategory(categoryName)) {
        closeCategoryModal();
        alert('เพิ่มหมวดหมู่เรียบร้อยแล้ว!');
    }
});

// Thai voice warning notification functions
function showNoThaiVoiceWarning() {
    // Check if warning already exists
    if (document.getElementById('thaiVoiceWarning')) return;

    const warning = document.createElement('div');
    warning.id = 'thaiVoiceWarning';
    warning.className = 'thai-voice-warning';
    warning.innerHTML = `
        <div class="warning-content">
            <span class="warning-icon">⚠️</span>
            <div class="warning-text">
                <strong>ไม่พบเสียงภาษาไทย</strong>
                <p>ระบบจะใช้เสียงภาษาอื่นแทน หากต้องการเสียงภาษาไทย กรุณาติดตั้งเสียง TTS ภาษาไทยใน Windows Settings → Time & Language → Speech → Add voices</p>
            </div>
            <button class="warning-close" onclick="hideNoThaiVoiceWarning()">✕</button>
        </div>
    `;

    const articleCard = document.querySelector('.article-card');
    articleCard.insertBefore(warning, articleCard.firstChild);
}

function hideNoThaiVoiceWarning() {
    const warning = document.getElementById('thaiVoiceWarning');
    if (warning) {
        warning.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => warning.remove(), 300);
    }
}

// Category filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        currentFilter = category;

        // Update active state
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Re-render with filter
        renderArticleCards(category);
    });
});

console.log('🎯 LawFlow Text-to-Speech initialized!');
console.log('💡 Tip: กด Space เพื่อเล่น/หยุด, กด Escape เพื่อหยุดการอ่าน');
/ /   P a r a g r a p h   M o d e   V a r i a b l e s  
 l e t   p a r a g r a p h M o d e   =   f a l s e ;  
 l e t   c u r r e n t P a r a g r a p h I n d e x   =   0 ;  
 l e t   p a r a g r a p h s   =   [ ] ;  
  
 / /   G e t   e l e m e n t s  
 c o n s t   p a r a g r a p h M o d e C h e c k b o x   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' p a r a g r a p h M o d e ' ) ;  
 c o n s t   p a r a g r a p h C o n t r o l s   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' p a r a g r a p h C o n t r o l s ' ) ;  
 c o n s t   p r e v P a r a g r a p h B t n   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' p r e v P a r a g r a p h ' ) ;  
 c o n s t   n e x t P a r a g r a p h B t n   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' n e x t P a r a g r a p h ' ) ;  
 c o n s t   p a r a g r a p h I n d i c a t o r   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' p a r a g r a p h I n d i c a t o r ' ) ;  
  
 / /   T o g g l e   p a r a g r a p h   m o d e  
 p a r a g r a p h M o d e C h e c k b o x . a d d E v e n t L i s t e n e r ( ' c h a n g e ' ,   ( e )   = >   {  
         p a r a g r a p h M o d e   =   e . t a r g e t . c h e c k e d ;  
  
         i f   ( p a r a g r a p h M o d e )   {  
                 / /   S h o w   c o n t r o l s  
                 p a r a g r a p h C o n t r o l s . s t y l e . d i s p l a y   =   ' f l e x ' ;  
  
                 / /   S p l i t   i n t o   p a r a g r a p h s  
                 c o n s t   t e x t   =   l a w T e x t . t e x t C o n t e n t . t r i m ( ) ;  
                 p a r a g r a p h s   =   t e x t . s p l i t ( ' \ n \ n ' ) . f i l t e r ( p   = >   p . t r i m ( ) . l e n g t h   >   0 ) ;  
  
                 i f   ( p a r a g r a p h s . l e n g t h   = = =   0 )   {  
                         p a r a g r a p h s   =   [ t e x t ] ;  
                 }  
  
                 c u r r e n t P a r a g r a p h I n d e x   =   0 ;  
                 s h o w C u r r e n t P a r a g r a p h ( ) ;  
         }   e l s e   {  
                 / /   H i d e   c o n t r o l s   a n d   s h o w   f u l l   t e x t  
                 p a r a g r a p h C o n t r o l s . s t y l e . d i s p l a y   =   ' n o n e ' ;  
                 / /   R e s t o r e   o r i g i n a l   t e x t   ( y o u ' l l   n e e d   t o   s t o r e   i t )  
                 u p d a t e P a r a g r a p h B u t t o n s ( ) ;  
         }  
 } ) ;  
  
 / /   S h o w   c u r r e n t   p a r a g r a p h  
 f u n c t i o n   s h o w C u r r e n t P a r a g r a p h ( )   {  
         i f   ( p a r a g r a p h s . l e n g t h   >   0 )   {  
                 l a w T e x t . t e x t C o n t e n t   =   p a r a g r a p h s [ c u r r e n t P a r a g r a p h I n d e x ] ;  
                 u p d a t e P a r a g r a p h I n d i c a t o r ( ) ;  
                 u p d a t e P a r a g r a p h B u t t o n s ( ) ;  
         }  
 }  
  
 / /   U p d a t e   i n d i c a t o r  
 f u n c t i o n   u p d a t e P a r a g r a p h I n d i c a t o r ( )   {  
         p a r a g r a p h I n d i c a t o r . t e x t C o n t e n t   =   ` $ { c u r r e n t P a r a g r a p h I n d e x   +   1 } / $ { p a r a g r a p h s . l e n g t h } ` ;  
 }  
  
 / /   U p d a t e   b u t t o n   s t a t e s  
 f u n c t i o n   u p d a t e P a r a g r a p h B u t t o n s ( )   {  
         p r e v P a r a g r a p h B t n . d i s a b l e d   =   c u r r e n t P a r a g r a p h I n d e x   = = =   0 ;  
         n e x t P a r a g r a p h B t n . d i s a b l e d   =   c u r r e n t P a r a g r a p h I n d e x   = = =   p a r a g r a p h s . l e n g t h   -   1 ;  
 }  
  
 / /   P r e v i o u s   p a r a g r a p h  
 p r e v P a r a g r a p h B t n . a d d E v e n t L i s t e n e r ( ' c l i c k ' ,   ( )   = >   {  
         i f   ( c u r r e n t P a r a g r a p h I n d e x   >   0 )   {  
                 c u r r e n t P a r a g r a p h I n d e x - - ;  
                 s h o w C u r r e n t P a r a g r a p h ( ) ;  
                 s t o p T e x t ( ) ;   / /   S t o p   c u r r e n t   p l a y b a c k  
         }  
 } ) ;  
  
 / /   N e x t   p a r a g r a p h  
 n e x t P a r a g r a p h B t n . a d d E v e n t L i s t e n e r ( ' c l i c k ' ,   ( )   = >   {  
         i f   ( c u r r e n t P a r a g r a p h I n d e x   <   p a r a g r a p h s . l e n g t h   -   1 )   {  
                 c u r r e n t P a r a g r a p h I n d e x + + ;  
                 s h o w C u r r e n t P a r a g r a p h ( ) ;  
                 s t o p T e x t ( ) ;   / /   S t o p   c u r r e n t   p l a y b a c k  
         }  
 } ) ;  
 