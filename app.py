from flask import Flask, jsonify, request
from flask_cors import CORS
import google.generativeai as genai
from PIL import Image
import os
from dotenv import load_dotenv
import base64
import io

# Load environment variables
load_dotenv()

# Configure the Gemini API
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment variables")
genai.configure(api_key=api_key)

# Supported languages
SUPPORTED_LANGUAGES = {
    'English': 'en',
    'Nepali': 'ne',
    'Hindi': 'hi',
    'Spanish': 'es',
    'French': 'fr',
    'Chinese': 'zh',
    'Japanese': 'ja',
    'Korean': 'ko',
    'Russian': 'ru',
    'German': 'de'
}

app = Flask(__name__)
CORS(app)

def get_image_from_base64(image_data):
    image_bytes = base64.b64decode(image_data.split(',')[1])
    return Image.open(io.BytesIO(image_bytes))

def generate_caption(image_data):
    try:
        image = get_image_from_base64(image_data)
        model = genai.GenerativeModel('gemini-1.5-pro')
        prompt = "Generate a creative and descriptive caption for this image. Keep it concise but engaging."
        response = model.generate_content([prompt, image])
        return response.text
    except Exception as e:
        print(f"Error generating caption: {str(e)}")
        raise

def get_gemini_response(image_data, category, word_limit):
    try:
        image = get_image_from_base64(image_data)
        
        prompt = f"""Create a {category} story based on this image. Be concise and creative.
        Requirements:
        - Approximately {word_limit} words
        - Match the {category} theme/genre
        - Keep descriptions brief but engaging
        """
        
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = model.generate_content(
            [image, prompt],
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                top_p=0.8,
                top_k=40,
                max_output_tokens=word_limit * 4  # Approximate tokens for word limit
            )
        )
        
        if not response or not response.text:
            return None
            
        return response.text.strip()

    except Exception as e:
        print(f"Error generating story: {str(e)}")
        return None

def translate_text(text, target_language):
    try:
        model = genai.GenerativeModel('gemini-1.5-pro')
        prompt = f"Translate the following text to {target_language}, maintaining the original formatting and structure:\n\n{text}"
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error in translation: {str(e)}")
        raise

@app.route('/supported-languages', methods=['GET'])
def get_supported_languages():
    return jsonify(list(SUPPORTED_LANGUAGES.keys()))

@app.route('/translate', methods=['POST'])
def translate_story():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        text = data.get('text')
        target_language = data.get('language')
        
        if not text or not target_language:
            return jsonify({'error': 'Text and target language are required'}), 400
        
        translated_text = translate_text(text, target_language)
        return jsonify({'translatedText': translated_text})
    
    except Exception as e:
        print(f"Error in translation: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/generate-caption', methods=['POST'])
def get_caption():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        image_data = data.get('image')
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400
        
        caption = generate_caption(image_data)
        return jsonify({'caption': caption})
    
    except Exception as e:
        print(f"Error generating caption: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/generate-story', methods=['POST'])
def generate_story():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        image_data = data.get('image')
        category = data.get('category', 'general')
        word_limit = min(data.get('wordLimit', 200), 500)  # Cap at 500 words
        
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400
        
        story = get_gemini_response(image_data, category, word_limit)
        return jsonify({'story': story})
    
    except Exception as e:
        print(f"Error generating story: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
