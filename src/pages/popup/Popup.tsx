import { OpenAI } from 'openai';
import React, { useState, useEffect } from 'react';
import '@pages/popup/Popup.css';

const defaultLearningStyle = 'spatial';
const learningEnhancements = {
  spatial: ['Spatial Representations', 'Chunking Information', 'Interactive Quizzes'],
  linguistic: ['Personalized Summaries', 'Interactive Q&A', 'Contextual Examples']
};

const OPENAI_API_KEY = '<ADD OPEN AI API KEY>';
const openai = new OpenAI({apiKey: OPENAI_API_KEY, dangerouslyAllowBrowser: true});

const Popup = () => {
  const [pageContent, setPageContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [learningStyle, setLearningStyle] = useState(defaultLearningStyle);
  const [enhancementType, setEnhancementType] = useState(learningEnhancements[defaultLearningStyle][0]);
  const [showContentControls, setShowContentControls] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [conversation, setConversation] = useState([]);


  useEffect(() => {
    chrome.storage.sync.get(['learningStyle', 'enhancementType'], (result) => {
      if (result.learningStyle) setLearningStyle(result.learningStyle);
      else setLearningStyle(defaultLearningStyle);

      if (result.enhancementType) setEnhancementType(result.enhancementType);
      else setEnhancementType(learningEnhancements[defaultLearningStyle][0]);
    });
  }, []);

  useEffect(() => {
    if (learningStyle) {
      const newEnhancementType = learningEnhancements[learningStyle][0];
      setEnhancementType(newEnhancementType);
      chrome.storage.sync.set({ learningStyle, enhancementType: newEnhancementType });
    }
  }, [learningStyle]);

  useEffect(() => {
    if (enhancementType) chrome.storage.sync.set({ enhancementType });
  }, [enhancementType]);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "getPageContent" }, (response) => {
        if (response?.content) {
          setPageContent(response.content);
          setEditedContent(response.content);
        } else {
          console.error("No response from content script");
        }
      });
    });
  }, []);

  const handleLearningStyleChange = (event) => setLearningStyle(event.target.value);

  const handleEnhancementTypeChange = (event) => setEnhancementType(event.target.value);

  const toggleContentControls = () => setShowContentControls(!showContentControls);

  const handleContentChange = (event) => setEditedContent(event.target.value);

  const resetContent = () => setEditedContent(pageContent);

  const sendMessageToOpenAI = async (message, conversationHistory) => {
    const messages = conversationHistory.map(c => ({
      role: c.sender === 'User' ? 'user' : 'assistant',
      content: c.text
    }));

    if (conversationHistory.length === 0) {
      messages.push({
        role: 'system',
        content: `The student has a ${learningStyle} learning style and prefers responses enhanced with ${enhancementType}. They are trying to learn the following material: ${pageContent}`
      });
    }
  
    messages.push({
      role: 'user',
      content: message
    });
    
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
      });
      return completion?.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error sending message to OpenAI:', error);
      return `Sorry, I wasn't able to process that message. Error: ${error.message}`;
    }
  };

  const handleNewMessage = async () => {
    if (!userMessage) return;
    const messageToSend = userMessage;
    setUserMessage('');

    const userMessageExists = conversation.some(message => message.sender === 'User' && message.text === messageToSend);

    if (!userMessageExists) {
      setConversation(prev => [...prev, { sender: 'User', text: messageToSend }]);
    }

    const openAIResponse = await sendMessageToOpenAI(messageToSend, conversation);
    setConversation(prev => [...prev, { sender: 'GPT', text: openAIResponse }]);
  };

  return (
    <div className="App">
      <div className="settings-panel">
        <div className='margin-bottom-small'>
          <label htmlFor="learning-style">Primary learning style:</label>
          <select id="learning-style" value={learningStyle} onChange={handleLearningStyleChange}>
            <option value="spatial">Spatial</option>
            <option value="linguistic">Linguistic</option>
          </select>
        </div>
        <div className='margin-bottom-medium'>
          <label htmlFor="enhancement-type">Learning enhancement:</label>
          <select id="enhancement-type" value={enhancementType} onChange={handleEnhancementTypeChange}>
            {learningEnhancements[learningStyle].map((type, index) => (
              <option key={index} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <button onClick={toggleContentControls} style={{ marginTop: '10px' }}>
        {showContentControls ? 'Hide' : 'Edit'} Content
      </button>

      {showContentControls && (
        <div className="content-display">
          <textarea
            value={editedContent}
            onChange={handleContentChange}
            style={{ width: '100%', height: '300px' }}
          />
          <button onClick={resetContent} style={{ marginTop: '10px' }}>
            Reset Content
          </button>
        </div>
      )}
      <div className="chat-interface">
        <div className="conversation-display">
          {conversation.map((message, index) => (
            <div key={index} className={`message ${message.sender === 'GPT' ? 'gpt-message' : 'user-message'}`}>
              {message.text}
            </div>
          ))}
        </div>
        <input
          type="text"
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          placeholder="Ask me anything..."
        />
        <button onClick={handleNewMessage}>Send</button>
      </div>
    </div>
  );
};

export default Popup;
