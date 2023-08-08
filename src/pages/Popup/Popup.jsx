import React, { useState, useEffect } from 'react';
import './Popup.css';

const Popup = () => {

  const [apiKey, setApiKey] = useState('');


  useEffect(() => {
    chrome.storage.local.get(['openaiApiKey'])
      .then(({ openaiApiKey }) => {
        setApiKey(openaiApiKey);
      })
  })

  return (
    <div className="container">
      <form>
        <div className='mb-3'>
          <label htmlFor='apiKey' className='form-label' >API Key</label>
          <input
            type='text'
            className='form-control'
            id='apiKey'
            name='apiKey'
            placeholder='OpenAI API Key'
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              chrome.storage.local.set({ openaiApiKey: e.target.value });
            }}
          />
          <div id='apiKeyHelp' className='form-text'>Go to your OpenAI profile and generate API Key</div>
        </div>
      </form>
    </div>
  );
};

export default Popup;
