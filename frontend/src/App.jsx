import { useState, useRef, useEffect } from 'react'
import './App.css'

const STORY_CATEGORIES = [
  'Adventure',
  'Mystery',
  'Romance',
  'Science Fiction',
  'Fantasy',
  'Horror',
  'Comedy',
  'Drama',
  'Fairy Tale',
  'Historical Fiction'
]

const LOADING_STEPS = [
  { icon: '', text: 'Analyzing image...' },
  { icon: '', text: 'Processing details...' },
  { icon: '', text: 'Generating creative elements...' },
  { icon: '', text: 'Crafting your story...' }
]

const loadingStates = [
  "Analyzing image...",
  "Crafting your story...",
  "Adding creative details...",
  "Polishing the narrative...",
  "Almost there..."
];

function App() {
  const [story, setStory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [category, setCategory] = useState('Adventure')
  const [wordLimit, setWordLimit] = useState(200)
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [displayedStory, setDisplayedStory] = useState('')
  const [storyVisible, setStoryVisible] = useState(false)
  const [caption, setCaption] = useState('')
  const [captionLoading, setCaptionLoading] = useState(false)
  const [captionVisible, setCaptionVisible] = useState(false)
  const [supportedLanguages, setSupportedLanguages] = useState([])
  const [selectedLanguage, setSelectedLanguage] = useState('')
  const [translatedStory, setTranslatedStory] = useState('')
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationVisible, setTranslationVisible] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [theme, setTheme] = useState('light')
  const [loadingStep, setLoadingStep] = useState(0);
  const fileInputRef = useRef(null)

  // Theme toggle handler
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    // Check system preference on mount
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = prefersDark ? 'dark' : 'light';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  useEffect(() => {
    if (loading) {
      const stepInterval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingStates.length);
      }, 2000);
      return () => clearInterval(stepInterval);
    } else {
      setLoadingStep(0);
    }
  }, [loading]);

  useEffect(() => {
    if (loading) {
      const stepInterval = setInterval(() => {
        setCurrentLoadingStep(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev))
        setProgress(prev => {
          if (prev < 30) return prev + 15
          if (prev < 60) return prev + 10
          if (prev < 90) return prev + 5
          return prev
        })
      }, 1500)

      return () => clearInterval(stepInterval)
    }
  }, [loading])

  useEffect(() => {
    if (story && !loading) {
      setProgress(100)
      let index = 0
      setDisplayedStory('')
      setStoryVisible(true)

      const typingInterval = setInterval(() => {
        if (index < story.length) {
          setDisplayedStory(prev => prev + story[index])
          index++
        } else {
          clearInterval(typingInterval)
        }
      }, 20)

      return () => clearInterval(typingInterval)
    }
  }, [story, loading])

  useEffect(() => {
    // Fetch supported languages when component mounts
    fetch('http://localhost:5000/supported-languages')
      .then(response => response.json())
      .then(languages => {
        setSupportedLanguages(languages)
        setSelectedLanguage(languages[0])
      })
      .catch(error => console.error('Error fetching languages:', error))
  }, [])

  const handleImageChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result)
        setStory(null)
        setError(null)
        setStoryVisible(false)
        setDisplayedStory('')
        setCaption('')
        setCaptionVisible(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const generateStory = async () => {
    if (!selectedImage) {
      setError('Please select an image first')
      return
    }

    setLoading(true)
    setError(null)
    setCurrentLoadingStep(0)
    setProgress(0)
    setStoryVisible(false)
    
    try {
      const compressedImage = await compressImage(selectedImage)
      
      const response = await fetch('http://localhost:5000/generate-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: compressedImage,
          category: category.toLowerCase(),
          wordLimit: parseInt(wordLimit)
        })
      })
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setStory(data.story || '')
    } catch (err) {
      setError(err.message || 'Failed to generate story. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const compressImage = async (base64String) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        let width = img.width
        let height = img.height
        const maxSize = 800
        
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        } else if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }
        
        canvas.width = width
        canvas.height = height
        
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = base64String
    })
  }

  const generateCaption = async () => {
    if (!selectedImage) {
      setError('Please select an image first')
      return
    }

    setCaptionLoading(true)
    setError(null)
    
    try {
      const response = await fetch('http://localhost:5000/generate-caption', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: selectedImage
        })
      })
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setCaption(data.caption)
      setCaptionVisible(true)
    } catch (err) {
      setError(err.message || 'Failed to generate caption. Please try again.')
    } finally {
      setCaptionLoading(false)
    }
  }

  const translateStory = async () => {
    if (!story || !selectedLanguage) {
      setError('Please generate a story first and select a language')
      return
    }

    setTranslationLoading(true)
    setError(null)
    setTranslationVisible(false)
    
    try {
      const response = await fetch('http://localhost:5000/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: story,
          language: selectedLanguage
        })
      })
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setTranslatedStory(data.translatedText)
      setTranslationVisible(true)
    } catch (err) {
      setError(err.message || 'Failed to translate story. Please try again.')
    } finally {
      setTranslationLoading(false)
    }
  }

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      
      if (translatedStory && translationVisible) {
        const langCode = {
          'English': 'en-US',
          'Spanish': 'es-ES',
          'French': 'fr-FR',
          'German': 'de-DE',
          'Chinese': 'zh-CN',
          'Japanese': 'ja-JP',
          'Korean': 'ko-KR',
          'Russian': 'ru-RU'
        }[selectedLanguage] || 'en-US'
        utterance.lang = langCode
      }

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => {
        setIsSpeaking(false)
        setError('Error playing speech. Please try again.')
      }

      window.speechSynthesis.speak(utterance)
    } else {
      setError('Speech synthesis is not supported in your browser.')
    }
  }

  const renderParticles = () => {
    return Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="particle"
        style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 2}s`,
        }}
      />
    ))
  }

  const renderLoading = () => (
    <div className="loading">
      <div className="loading-content">
        <div className="loading-spinner" />
        <div className="loading-text">{loadingStates[loadingStep]}</div>
        <div className="loading-progress" />
      </div>
    </div>
  );

  return (
    <div className="container">
      <button 
        className="theme-toggle" 
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
      <h1 className="app-title">
        <span>AI Story Generator</span>
      </h1>
      
      <div className="main-content">
        <div className="image-section">
          <h2>Upload Image</h2>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          
          <div 
            className="upload-area"
            onClick={() => fileInputRef.current.click()}
          >
            {selectedImage ? (
              <img 
                src={selectedImage} 
                alt="Preview" 
                className="image-preview"
              />
            ) : (
              <p>Click to upload an image</p>
            )}
          </div>

          {selectedImage && (
            <div className="caption-section">
              <button
                className="caption-button"
                onClick={generateCaption}
                disabled={captionLoading}
              >
                {captionLoading ? 'Generating Caption...' : 'Generate Caption'}
              </button>

              {captionLoading && (
                <div className="caption-loading">
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                </div>
              )}

              {caption && (
                <div className={`caption-text ${captionVisible ? 'visible' : ''}`}>
                  {caption}
                </div>
              )}
            </div>
          )}

          <div className="controls">
            <select 
              className="select-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {STORY_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div className="word-limit-control">
              <label>Word Limit: {wordLimit}</label>
              <input
                type="range"
                min="100"
                max="500"
                step="50"
                value={wordLimit}
                onChange={(e) => setWordLimit(e.target.value)}
                className="range-input"
              />
            </div>

            <button 
              className="generate-btn"
              onClick={generateStory}
              disabled={loading || !selectedImage}
            >
              {loading ? 'Generating...' : 'Generate Story'}
            </button>
          </div>
        </div>

        <div className="story-section">
          {loading ? (
            renderLoading()
          ) : (
            <div>
              {error && (
                <div className="error">
                  {error}
                </div>
              )}
              
              {displayedStory && !loading && (
                <div className="story-container">
                  <div className={`story-content ${storyVisible ? 'visible' : ''}`}>
                    <div className={story.length === displayedStory.length ? '' : 'typing-effect'}>
                      {displayedStory || ''}
                    </div>
                    <button 
                      className={`speak-button ${isSpeaking ? 'speaking' : ''}`}
                      onClick={() => isSpeaking ? window.speechSynthesis.cancel() : speakText(displayedStory)}
                      title={isSpeaking ? 'Stop Speaking' : 'Read Story'}
                    >
                      {isSpeaking ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14.016 3.234C18.095 4.668 21 8.501 21 13c0 4.499-2.905 8.332-6.984 9.766v-2.134c2.909-1.271 4.984-4.197 4.984-7.632s-2.075-6.361-4.984-7.632V3.234zM8.707 5.707L12 2.414v19.172l-3.293-3.293L8.414 18H4V6h4.414l.293-.293zM16.5 13c0 1.933-1.067 3.665-2.484 4.632V8.368C15.433 9.335 16.5 11.067 16.5 13z"/>
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="translation-section">
                    <div className="translation-controls">
                      <select
                        className="language-select"
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                      >
                        {supportedLanguages.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                      <button
                        className="translate-button"
                        onClick={translateStory}
                        disabled={translationLoading}
                      >
                        {translationLoading ? 'Translating...' : 'Translate'}
                      </button>
                    </div>

                    {translationLoading && (
                      <div className="translation-loading">
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                      </div>
                    )}

                    {translatedStory && (
                      <div className={`translated-text ${translationVisible ? 'visible' : ''}`}>
                        {translatedStory || ''}
                        <button 
                          className={`speak-button ${isSpeaking ? 'speaking' : ''}`}
                          onClick={() => isSpeaking ? window.speechSynthesis.cancel() : speakText(translatedStory)}
                          title={isSpeaking ? 'Stop Speaking' : 'Read Translation'}
                        >
                          {isSpeaking ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M14.016 3.234C18.095 4.668 21 8.501 21 13c0 4.499-2.905 8.332-6.984 9.766v-2.134c2.909-1.271 4.984-4.197 4.984-7.632s-2.075-6.361-4.984-7.632V3.234zM8.707 5.707L12 2.414v19.172l-3.293-3.293L8.414 18H4V6h4.414l.293-.293zM16.5 13c0 1.933-1.067 3.665-2.484 4.632V8.368C15.433 9.335 16.5 11.067 16.5 13z"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {!displayedStory && !loading && !error && (
                <div className="placeholder-text">
                  Your story will appear here...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="footer">
        <p>
          Created with ❤️ by{' '}
          <a href="https://github.com/himalf" target="_blank" rel="noopener noreferrer">
            Himal Fullel
          </a>
          {' & '}
          <a href="https://github.com/sushantshrestha" target="_blank" rel="noopener noreferrer">
            Sushant Shrestha
          </a>
        </p>
        <p>Copyright 2024 AI Story Generator. All rights reserved</p>
      </footer>
    </div>
  )
}

export default App
