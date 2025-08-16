document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatBox = document.getElementById('chat-box');
    const chatForm = document.getElementById('chat-form');
    const userPrompt = document.getElementById('user-prompt');
    const imageUpload = document.getElementById('image-upload');
    const imageName = document.getElementById('image-name');
    const imageUploadContainer = document.getElementById('image-upload-container');
    const modeChatBtn = document.getElementById('mode-chat');
    const modeImageBtn = document.getElementById('mode-image');
    
    let currentMode = 'chat'; // 'chat' or 'image'

    // --- Mode Switching Logic ---
    modeChatBtn.addEventListener('click', () => switchMode('chat'));
    modeImageBtn.addEventListener('click', () => switchMode('image'));

    function switchMode(newMode) {
        currentMode = newMode;
        modeChatBtn.classList.toggle('active', newMode === 'chat');
        modeImageBtn.classList.toggle('active', newMode === 'image');
        imageUploadContainer.style.display = newMode === 'chat' ? 'block' : 'none';
        userPrompt.placeholder = newMode === 'chat' ? 'Ask with text and/or image...' : 'Describe the image you want to generate...';
        clearInput();
    }
    
    // --- Form Submission Logic ---
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const prompt = userPrompt.value.trim();
        const imageFile = imageUpload.files[0];

        if (!prompt && !imageFile) return;

        if (currentMode === 'chat') {
            handleChatSubmit(prompt, imageFile);
        } else {
            handleImageGenerationSubmit(prompt);
        }
    });

    // --- Auto-resize Textarea ---
    userPrompt.addEventListener('input', () => {
        userPrompt.style.height = 'auto';
        userPrompt.style.height = (userPrompt.scrollHeight) + 'px';
    });

    // --- Display selected image name ---
    imageUpload.addEventListener('change', () => {
        imageName.textContent = imageUpload.files[0] ? imageUpload.files[0].name : '';
    });

    // --- Function to handle chat/vision submission ---
    async function handleChatSubmit(prompt, imageFile) {
        // Display user's prompt in chat box
        displayUserMessage(prompt, imageFile);
        
        // Prepare FormData to send to the backend
        const formData = new FormData();
        formData.append('prompt', prompt);
        if (imageFile) {
            formData.append('image', imageFile);
        }

        clearInput();
        displayTypingIndicator();

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                body: formData, // No Content-Type header needed; browser sets it
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network response was not ok');
            }

            const data = await response.json();
            displayGeminiMessage(data.response);

        } catch (error) {
            console.error('Error:', error);
            displayGeminiMessage(`Error: ${error.message}`);
        }
    }

    // --- Function to handle image generation submission ---
    async function handleImageGenerationSubmit(prompt) {
        displayUserMessage(`Generate an image of: ${prompt}`);
        clearInput();
        displayTypingIndicator();

        try {
            const response = await fetch('/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate image');
            }

            const data = await response.json();
            displayGeneratedImage(data.image_url);

        } catch (error) {
            console.error('Error:', error);
            displayGeminiMessage(`Error: ${error.message}`);
        }
    }


    // --- Display Functions ---

    function displayUserMessage(prompt, imageFile) {
        let messageHtml = `<div class="message user-message"><div class="message-content">${escapeHTML(prompt)}`;
        
        if (imageFile) {
            const imageUrl = URL.createObjectURL(imageFile);
            messageHtml += `<br><img src="${imageUrl}" alt="Uploaded Image" class="uploaded-image">`;
        }
        
        messageHtml += `</div></div>`;
        chatBox.innerHTML += messageHtml;
        scrollToBottom();
    }

    function displayGeminiMessage(response) {
        removeTypingIndicator();
        const formattedResponse = formatResponse(response);
        const messageHtml = `<div class="message gemini-message"><div class="message-content">${formattedResponse}</div></div>`;
        chatBox.innerHTML += messageHtml;
        // Re-run Prism to highlight any new code blocks
        Prism.highlightAll();
        addCopyListeners();
        scrollToBottom();
    }
    
    function displayGeneratedImage(imageUrl) {
        removeTypingIndicator();
        const messageHtml = `<div class="message gemini-message"><div class="message-content"><img src="${imageUrl}" alt="Generated Image" class="generated-image"></div></div>`;
        chatBox.innerHTML += messageHtml;
        scrollToBottom();
    }

    function displayTypingIndicator() {
        chatBox.innerHTML += `<div class="message gemini-message typing-indicator"><div class="message-content">...</div></div>`;
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = chatBox.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
    }

    function formatResponse(text) {
        // Use a regex to find code blocks (```language\ncode\n```)
        const codeBlockRegex = /```(\w+)?\s*([\s\S]+?)```/g;
        return escapeHTML(text).replace(codeBlockRegex, (match, language, code) => {
            language = language || 'plaintext';
            const template = document.getElementById('code-block-template').content.cloneNode(true);
            template.querySelector('.language-name').textContent = language;
            const codeContent = template.querySelector('.code-content');
            codeContent.className = `language-${language}`;
            codeContent.textContent = unescapeHTML(code.trim());
            return template.firstElementChild.outerHTML;
        });
    }

    // --- Utility Functions ---
    
    function addCopyListeners() {
        chatBox.querySelectorAll('.copy-code-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const code = e.currentTarget.closest('.code-block-wrapper').querySelector('code').textContent;
                navigator.clipboard.writeText(code).then(() => {
                    button.textContent = 'Copied!';
                    setTimeout(() => {
                        button.innerHTML = '<span class="material-symbols-outlined">content_copy</span> Copy Code';
                    }, 2000);
                });
            });
        });
    }
    
    function clearInput() {
        userPrompt.value = '';
        imageUpload.value = ''; // Resets file input
        imageName.textContent = '';
        userPrompt.style.height = 'auto';
    }
    
    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function escapeHTML(str) {
        return str.replace(/[&<>"']/g, (match) => {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match];
        });
    }

    function unescapeHTML(str) {
        // This is specifically for code blocks that have been escaped
        return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    }

});
