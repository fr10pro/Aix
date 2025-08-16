import os
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify, abort
from PIL import Image
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Configure the upload folder and allowed extensions
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Configure the Gemini API client
try:
    genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
    # Using gemini-1.5-flash for its multimodal capabilities and speed
    model = genai.GenerativeModel('gemini-1.5-flash') 
except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    model = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    if not model:
        return jsonify({"error": "Gemini API not configured"}), 500

    # Extract text prompt and the uploaded file
    text_prompt = request.form.get('prompt')
    image_file = request.files.get('image')

    if not text_prompt and not image_file:
        return jsonify({"error": "A prompt or an image is required"}), 400

    prompt_parts = []
    
    # Handle image upload
    if image_file:
        if not allowed_file(image_file.filename):
            return jsonify({"error": "Invalid file type"}), 400
        
        try:
            # Open the image using Pillow
            img = Image.open(image_file.stream)
            prompt_parts.append(img)
        except Exception as e:
            print(f"Error processing image: {e}")
            return jsonify({"error": "Could not process image file"}), 500

    # Add the text prompt if it exists
    if text_prompt:
        prompt_parts.append(text_prompt)
        
    try:
        # Generate content using the multimodal prompt
        response = model.generate_content(prompt_parts)
        
        # Return the generated text
        return jsonify({"response": response.text})

    except Exception as e:
        print(f"Error during Gemini API call: {e}")
        # Provide a more specific error message if available
        error_message = f"An error occurred with the Gemini API: {str(e)}"
        return jsonify({"error": error_message}), 500

# --- Placeholder for Image Generation ---
# This would require a different API/model like Imagen.
# We are building the UI for it, but the backend logic is a placeholder.
@app.route('/generate-image', methods=['POST'])
def generate_image():
    prompt = request.json.get('prompt')
    if not prompt:
        return jsonify({"error": "Prompt is required for image generation"}), 400

    #
    # --- IMAGE GENERATION API CALL WOULD GO HERE ---
    # Example:
    # try:
    #   image_url = some_image_generation_api(prompt, api_key=os.getenv("IMAGEN_API_KEY"))
    #   return jsonify({"image_url": image_url})
    # except Exception as e:
    #   return jsonify({"error": str(e)}), 500
    #
    
    # For now, return a placeholder response
    placeholder_url = f"https://via.placeholder.com/512x512.png?text=Generated+Image+for:{prompt.replace(' ', '+')}"
    return jsonify({"image_url": placeholder_url})


if __name__ == '__main__':
    app.run(debug=True, port=5000)